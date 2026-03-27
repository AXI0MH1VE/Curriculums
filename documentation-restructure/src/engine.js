import { getStylePreset, normalizeModelConfig } from "./modelConfig.js";
import { assertArray, assertNonEmptyString, normalizeScore } from "./validators.js";

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function scoreEvidenceItem(evidence, weights) {
  const trustworthiness = normalizeScore(evidence.trustworthiness);
  const freshness = normalizeScore(evidence.freshness);
  const consistency = normalizeScore(evidence.consistency);
  const projectedBenefit = normalizeScore(evidence.projectedBenefit);

  return {
    id: evidence.id ?? null,
    source: evidence.source ?? "unknown",
    dimensions: {
      trustworthiness,
      freshness,
      consistency,
      projectedBenefit
    },
    score:
      trustworthiness * weights.trustworthiness +
      freshness * weights.freshness +
      consistency * weights.consistency +
      projectedBenefit * weights.projectedBenefit
  };
}

export function evaluateConcept(payload, options = {}) {
  assertNonEmptyString(payload.concept, "concept");
  assertNonEmptyString(payload.targetDemographic, "targetDemographic");
  assertArray(payload.painPoints, "painPoints");
  assertArray(payload.desiredOutcomes, "desiredOutcomes");
  assertArray(payload.claims, "claims");
  const modelConfig = normalizeModelConfig(options.modelConfig);
  const stylePreset = getStylePreset(modelConfig.generation.style);
  const scoreThreshold = options.scoreThreshold ?? modelConfig.thresholds.evidenceScore;
  const evaluatedClaims = payload.claims.map((claim, index) => {
    assertNonEmptyString(claim.statement, `claims[${index}].statement`);
    assertArray(claim.evidence, `claims[${index}].evidence`);
    const evidenceBreakdown = claim.evidence.map((evidence) => scoreEvidenceItem(evidence, modelConfig.weights));
    const evidenceScore = average(evidenceBreakdown.map((item) => item.score));
    const decision = evidenceScore >= scoreThreshold ? "validated" : "insufficient";

    return {
      statement: claim.statement,
      evidenceScore: Number(evidenceScore.toFixed(4)),
      decision,
      evidenceBreakdown
    };
  });

  const validatedClaims = evaluatedClaims.filter((claim) => claim.decision === "validated");
  const insufficientClaims = evaluatedClaims.filter((claim) => claim.decision === "insufficient");
  const strictModeBlocked = modelConfig.generation.strictMode && insufficientClaims.length > 0;
  const shouldStopFeatureDevelopment = validatedClaims.length === 0 || strictModeBlocked;

  const featureHierarchy = validatedClaims
    .sort((a, b) => b.evidenceScore - a.evidenceScore)
    .slice(0, modelConfig.generation.maxFeatures)
    .map((claim, idx) => ({
      rank: idx + 1,
      feature: `${modelConfig.generation.featureLabel} ${idx + 1}: ${claim.statement}`,
      mappedClaimScore: claim.evidenceScore
    }));

  const mvpArchitecture = {
    interfaces: shouldStopFeatureDevelopment
      ? []
      : stylePreset.interfaces,
    workflows: shouldStopFeatureDevelopment
      ? []
      : stylePreset.workflows,
    dataObjects: shouldStopFeatureDevelopment
      ? []
      : stylePreset.dataObjects,
    apiNeeds: shouldStopFeatureDevelopment
      ? []
      : ["/v1/evaluate", "/v1/feedback", "/v1/claims/:id"]
  };

  const riskRegister = modelConfig.generation.includeRiskRegister
    ? insufficientClaims.map((claim) => ({
        claim: claim.statement,
        currentScore: claim.evidenceScore,
        requiredScore: scoreThreshold,
        scoreGap: Number((scoreThreshold - claim.evidenceScore).toFixed(4))
      }))
    : [];

  return {
    validatedProblemStatement: `${payload.targetDemographic} need a solution for ${payload.painPoints.join(", ")} so they can ${payload.desiredOutcomes.join(", ")}.`,
    decisionSummary: {
      totalClaims: evaluatedClaims.length,
      validatedClaims: validatedClaims.length,
      insufficientClaims: insufficientClaims.length,
      scoreThreshold,
      strictModeBlocked,
      shouldStopFeatureDevelopment
    },
    activeModelProfile: options.profileName ?? "custom",
    modelConfiguration: modelConfig,
    evidenceBasedFeatureHierarchy: featureHierarchy,
    mvpArchitecture,
    riskRegister,
    loopGateDecision: shouldStopFeatureDevelopment
      ? strictModeBlocked
        ? "STOP_DUE_TO_STRICT_MODE"
        : "STOP_AND_REVALIDATE"
      : "BUILD_MINIMUM_FUNCTIONAL_VERSION",
    claimLedger: evaluatedClaims
  };
}

export function evaluatePostLaunchFeedback(payload, options = {}) {
  assertArray(payload.feedbackSignals, "feedbackSignals");
  const modelConfig = normalizeModelConfig(options.modelConfig);
  const scaleThreshold = options.scaleThreshold ?? modelConfig.thresholds.scale;
  const reviseThreshold = options.reviseThreshold ?? modelConfig.thresholds.revise;
  const averageUtility = average(payload.feedbackSignals.map((signal) => normalizeScore(signal.utilityScore)));
  const rounded = Number(averageUtility.toFixed(4));

  if (rounded >= scaleThreshold) {
    return {
      averageUtility: rounded,
      action: "SCALE",
      rationale: "User feedback affirms utility."
    };
  }

  if (rounded >= reviseThreshold) {
    return {
      averageUtility: rounded,
      action: "REVISE",
      rationale: "Feedback is mixed; revise and retest."
    };
  }

  return {
    averageUtility: rounded,
    action: "REMOVE_OR_REVALIDATE",
    rationale: "Feedback disputes core utility claims."
  };
}
