/**
 * Self-Validation Module
 * ---------------------
 * This module turns the system's own claims about itself into
 * structured evidence payloads, runs them through the same
 * evaluateConcept engine that users rely on, and produces a
 * machine-readable legitimacy report.
 *
 * The proof is functional, not descriptive:
 *   - Each claim is tested by executing real system operations.
 *   - Evidence scores come from measurable pass/fail outcomes.
 *   - The same scoring weights, thresholds, and gate logic
 *     that govern external evaluations govern this one.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import { evaluateConcept, evaluatePostLaunchFeedback } from "./engine.js";
import { generateKnowledgeBaseWorkflow, getKnowledgeBaseWorkflowTemplate } from "./kbProtocol.js";
import { normalizeModelConfig, getStylePreset, DEFAULT_MODEL_CONFIG } from "./modelConfig.js";
import { normalizeScore, clamp, assertNonEmptyString, assertArray, assertObject } from "./validators.js";
import { getActiveModelProfile, listModelProfiles } from "./modelProfiles.js";

// ─── Functional Probes ──────────────────────────────────────────────
// Each probe executes a real system operation and returns a numeric
// score (0–1) based on whether the operation produced correct output.

function probeEvidenceScoring() {
  const result = evaluateConcept({
    concept: "Self-validation probe: evidence scoring",
    targetDemographic: "system operators",
    painPoints: ["unverified claims"],
    desiredOutcomes: ["auditable evidence trail"],
    claims: [
      {
        statement: "Weighted evidence scoring differentiates strong from weak claims",
        evidence: [
          { source: "probe:strong-signal", trustworthiness: 0.95, freshness: 0.9, consistency: 0.9, projectedBenefit: 0.95 },
          { source: "probe:weak-signal",   trustworthiness: 0.15, freshness: 0.2, consistency: 0.1, projectedBenefit: 0.2  }
        ]
      }
    ]
  });

  const breakdown = result.claimLedger[0].evidenceBreakdown;
  const strongScore = breakdown[0].score;
  const weakScore   = breakdown[1].score;

  // Strong evidence must outscore weak evidence.
  const differentiates = strongScore > weakScore;
  // Scores must be bounded [0, 1].
  const bounded = strongScore >= 0 && strongScore <= 1 && weakScore >= 0 && weakScore <= 1;
  // Dimensions must all be present.
  const hasDimensions = breakdown.every(
    (item) => item.dimensions && "trustworthiness" in item.dimensions && "freshness" in item.dimensions
  );

  return {
    id: "functional:evidence-scoring",
    source: "live system execution — evaluateConcept",
    trustworthiness: differentiates ? 0.95 : 0.15,
    freshness: 1.0,
    consistency: bounded && hasDimensions ? 0.95 : 0.2,
    projectedBenefit: differentiates ? 0.9 : 0.1,
    detail: {
      strongScore,
      weakScore,
      differentiates,
      bounded,
      hasDimensions
    }
  };
}

function probeGateLogic() {
  // Test STOP gate
  const stopResult = evaluateConcept({
    concept: "Probe: gate logic stop",
    targetDemographic: "probe",
    painPoints: ["none"],
    desiredOutcomes: ["confirm stop gate"],
    claims: [
      {
        statement: "Low evidence triggers stop",
        evidence: [
          { source: "probe:insufficient", trustworthiness: 0.1, freshness: 0.1, consistency: 0.1, projectedBenefit: 0.1 }
        ]
      }
    ]
  });

  // Test BUILD gate
  const buildResult = evaluateConcept({
    concept: "Probe: gate logic build",
    targetDemographic: "probe",
    painPoints: ["none"],
    desiredOutcomes: ["confirm build gate"],
    claims: [
      {
        statement: "Strong evidence triggers build",
        evidence: [
          { source: "probe:validated", trustworthiness: 0.95, freshness: 0.9, consistency: 0.9, projectedBenefit: 0.95 }
        ]
      }
    ]
  });

  // Test STRICT MODE gate
  const strictResult = evaluateConcept(
    {
      concept: "Probe: strict mode",
      targetDemographic: "probe",
      painPoints: ["none"],
      desiredOutcomes: ["verify strict mode block"],
      claims: [
        {
          statement: "Validated claim",
          evidence: [
            { source: "probe:strong", trustworthiness: 0.9, freshness: 0.9, consistency: 0.9, projectedBenefit: 0.9 }
          ]
        },
        {
          statement: "Insufficient claim",
          evidence: [
            { source: "probe:weak", trustworthiness: 0.1, freshness: 0.1, consistency: 0.1, projectedBenefit: 0.1 }
          ]
        }
      ]
    },
    { modelConfig: { generation: { strictMode: true } } }
  );

  const stopWorks    = stopResult.loopGateDecision === "STOP_AND_REVALIDATE";
  const buildWorks   = buildResult.loopGateDecision === "BUILD_MINIMUM_FUNCTIONAL_VERSION";
  const strictWorks  = strictResult.loopGateDecision === "STOP_DUE_TO_STRICT_MODE";

  return {
    id: "functional:gate-logic",
    source: "live system execution — evaluateConcept × 3 gate paths",
    trustworthiness: stopWorks && buildWorks && strictWorks ? 0.95 : 0.1,
    freshness: 1.0,
    consistency: stopWorks && buildWorks && strictWorks ? 0.95 : 0.15,
    projectedBenefit: 0.9,
    detail: { stopWorks, buildWorks, strictWorks }
  };
}

function probeFeedbackLoop() {
  const scaleResult  = evaluatePostLaunchFeedback({ feedbackSignals: [{ utilityScore: 0.9 }, { utilityScore: 0.85 }] });
  const reviseResult = evaluatePostLaunchFeedback({ feedbackSignals: [{ utilityScore: 0.55 }, { utilityScore: 0.5 }] });
  const removeResult = evaluatePostLaunchFeedback({ feedbackSignals: [{ utilityScore: 0.1 }, { utilityScore: 0.2 }] });

  const scaleCorrect  = scaleResult.action === "SCALE";
  const reviseCorrect = reviseResult.action === "REVISE";
  const removeCorrect = removeResult.action === "REMOVE_OR_REVALIDATE";

  return {
    id: "functional:feedback-loop",
    source: "live system execution — evaluatePostLaunchFeedback × 3 paths",
    trustworthiness: scaleCorrect && reviseCorrect && removeCorrect ? 0.95 : 0.1,
    freshness: 1.0,
    consistency: scaleCorrect && reviseCorrect && removeCorrect ? 0.9 : 0.15,
    projectedBenefit: 0.85,
    detail: { scaleCorrect, reviseCorrect, removeCorrect }
  };
}

function probeKnowledgeBaseProtocol() {
  const template = getKnowledgeBaseWorkflowTemplate();
  const artifact = generateKnowledgeBaseWorkflow(template.templatePayload);

  const hasHeader        = typeof artifact.header === "string" && artifact.header.length > 0;
  const hasAttribution   = artifact.attribution && artifact.attribution.entity && artifact.attribution.creators;
  const hasLadder        = artifact.ladder && artifact.ladder.problem && artifact.ladder.solution && artifact.ladder.value;
  const hasTransparency  = artifact.transparency && artifact.transparency.sources && artifact.transparency.assumptions;
  const hasConstraints   = artifact.constraintCompatibility && "conflicts" in artifact.constraintCompatibility;
  const hasOperatorGates = artifact.operatorControl && artifact.operatorControl.gates;
  const conflictReported = artifact.constraintCompatibility.conflicts.length > 0; // no_refusal should conflict

  const allPass = hasHeader && hasAttribution && hasLadder && hasTransparency && hasConstraints && hasOperatorGates && conflictReported;

  return {
    id: "functional:kb-protocol",
    source: "live system execution — generateKnowledgeBaseWorkflow (full template round-trip)",
    trustworthiness: allPass ? 0.95 : 0.15,
    freshness: 1.0,
    consistency: allPass ? 0.95 : 0.2,
    projectedBenefit: allPass ? 0.9 : 0.1,
    detail: { hasHeader, hasAttribution, hasLadder, hasTransparency, hasConstraints, hasOperatorGates, conflictReported }
  };
}

function probeModelConfiguration() {
  // Verify normalization, clamping, and weight re-balancing
  const config = normalizeModelConfig({
    weights: { trustworthiness: 2, freshness: -5, consistency: 0.5, projectedBenefit: 0.5 },
    thresholds: { evidenceScore: 1.5, scale: 0.7, revise: 0.8 },
    generation: { style: "nonexistent", maxFeatures: 999, strictMode: "not-a-boolean" }
  });

  const weightsSum     = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const weightsNormed  = Math.abs(weightsSum - 1) < 0.01;
  const freshnessClamped = config.weights.freshness >= 0;
  const evidenceClamped  = config.thresholds.evidenceScore <= 1;
  const reviseConstrained = config.thresholds.revise < config.thresholds.scale;
  const styleFallback    = config.generation.style === "minimalist";
  const maxFeaturesCapped = config.generation.maxFeatures <= 12;
  const strictFallback   = config.generation.strictMode === false;

  const allPass = weightsNormed && freshnessClamped && evidenceClamped && reviseConstrained && styleFallback && maxFeaturesCapped && strictFallback;

  return {
    id: "functional:model-config-normalization",
    source: "live system execution — normalizeModelConfig with adversarial inputs",
    trustworthiness: allPass ? 0.95 : 0.1,
    freshness: 1.0,
    consistency: allPass ? 0.95 : 0.2,
    projectedBenefit: allPass ? 0.85 : 0.1,
    detail: { weightsNormed, freshnessClamped, evidenceClamped, reviseConstrained, styleFallback, maxFeaturesCapped, strictFallback }
  };
}

function probeValidatorBoundary() {
  // Confirm validators enforce contracts
  let assertStringCaught  = false;
  let assertArrayCaught   = false;
  let assertObjectCaught  = false;
  let scoreClampedHigh    = false;
  let scoreClampedLow     = false;
  let scoreClampedNaN     = false;

  try { assertNonEmptyString("", "test"); } catch { assertStringCaught = true; }
  try { assertArray("not-array", "test"); } catch { assertArrayCaught = true; }
  try { assertObject(null, "test"); } catch { assertObjectCaught = true; }

  scoreClampedHigh = normalizeScore(5) === 1;
  scoreClampedLow  = normalizeScore(-3) === 0;
  scoreClampedNaN  = normalizeScore("garbage") === 0;

  const allPass = assertStringCaught && assertArrayCaught && assertObjectCaught && scoreClampedHigh && scoreClampedLow && scoreClampedNaN;

  return {
    id: "functional:validator-boundary",
    source: "live system execution — validators with boundary/adversarial inputs",
    trustworthiness: allPass ? 0.95 : 0.15,
    freshness: 1.0,
    consistency: allPass ? 0.95 : 0.1,
    projectedBenefit: allPass ? 0.8 : 0.1,
    detail: { assertStringCaught, assertArrayCaught, assertObjectCaught, scoreClampedHigh, scoreClampedLow, scoreClampedNaN }
  };
}

function probeRiskRegister() {
  const result = evaluateConcept({
    concept: "Probe: risk register generation",
    targetDemographic: "probe",
    painPoints: ["unverified risk"],
    desiredOutcomes: ["auditable risk ledger"],
    claims: [
      {
        statement: "Weak claim for risk register probe",
        evidence: [
          { source: "probe:weak", trustworthiness: 0.15, freshness: 0.2, consistency: 0.1, projectedBenefit: 0.15 }
        ]
      }
    ]
  }, { modelConfig: { generation: { includeRiskRegister: true } } });

  const hasRisks       = result.riskRegister.length > 0;
  const hasScoreGap    = hasRisks && typeof result.riskRegister[0].scoreGap === "number";
  const gapPositive    = hasRisks && result.riskRegister[0].scoreGap > 0;
  const hasRequired    = hasRisks && typeof result.riskRegister[0].requiredScore === "number";

  const allPass = hasRisks && hasScoreGap && gapPositive && hasRequired;

  return {
    id: "functional:risk-register",
    source: "live system execution — evaluateConcept risk register output",
    trustworthiness: allPass ? 0.9 : 0.15,
    freshness: 1.0,
    consistency: allPass ? 0.9 : 0.15,
    projectedBenefit: allPass ? 0.85 : 0.1,
    detail: { hasRisks, hasScoreGap, gapPositive, hasRequired }
  };
}

// ─── Self-Validation Entrypoint ─────────────────────────────────────

export function runSelfValidation(options = {}) {
  const timestamp = new Date().toISOString();

  // Execute all functional probes — these are LIVE operations, not descriptions.
  const probeResults = [
    probeEvidenceScoring(),
    probeGateLogic(),
    probeFeedbackLoop(),
    probeKnowledgeBaseProtocol(),
    probeModelConfiguration(),
    probeValidatorBoundary(),
    probeRiskRegister()
  ];

  // Build claims from probe results.
  // Each claim's evidence array contains the probe's measurable output.
  const claims = [
    {
      statement: "The evidence scoring engine correctly differentiates strong signals from weak signals using weighted dimensional analysis.",
      evidence: [probeResults[0]]
    },
    {
      statement: "The gate logic enforces STOP / BUILD / STRICT_MODE decisions based on computed evidence thresholds.",
      evidence: [probeResults[1]]
    },
    {
      statement: "The post-launch feedback loop correctly routes to SCALE / REVISE / REMOVE actions based on aggregate utility scores.",
      evidence: [probeResults[2]]
    },
    {
      statement: "The Knowledge Base protocol engine generates fully structured artifacts with attribution, transparency, constraint compatibility, and operator control gates.",
      evidence: [probeResults[3]]
    },
    {
      statement: "The model configuration normalizer safely handles adversarial inputs: clamping out-of-range values, re-balancing weights, and falling back to defaults for invalid types.",
      evidence: [probeResults[4]]
    },
    {
      statement: "Input validators enforce type contracts and boundary conditions, rejecting malformed data before it reaches the engine.",
      evidence: [probeResults[5]]
    },
    {
      statement: "The risk register quantifies the gap between current evidence and required thresholds for every insufficient claim.",
      evidence: [probeResults[6]]
    }
  ];

  // Feed the system's own claims about itself into its own engine.
  const selfEvaluation = evaluateConcept(
    {
      concept: "Validation-First MVP Constructor: Self-Legitimacy Audit",
      targetDemographic: "institutional operators, product teams, and auditors",
      painPoints: [
        "unverifiable product claims",
        "descriptions without functional proof",
        "trust deficit in AI-generated outputs"
      ],
      desiredOutcomes: [
        "machine-verifiable legitimacy through functional utility",
        "auditable evidence trail for every claim",
        "zero reliance on subjective self-description"
      ],
      claims
    },
    {
      modelConfig: options.modelConfig ?? getActiveModelProfile().config,
      profileName: options.profileName ?? getActiveModelProfile().name
    }
  );

  // Compute a meta-integrity signal: what percentage of probes produced all-pass results.
  const probePassCount = probeResults.filter(
    (probe) => probe.trustworthiness >= 0.9 && probe.consistency >= 0.9
  ).length;
  const probeIntegrity = Number((probePassCount / probeResults.length).toFixed(4));

  return {
    meta: {
      title: "Self-Validation Legitimacy Report",
      purpose: "Demonstrates system legitimacy through functional utility, not description. Every claim is backed by a live execution probe whose measurable output is fed into the same scoring engine that governs all external evaluations.",
      timestamp,
      probeCount: probeResults.length,
      probePassRate: probeIntegrity,
      methodology: "Each probe executes a real system operation, measures the correctness of the output, and converts the result into a normalized evidence score. Those scores are then submitted to evaluateConcept — the same function users call — which applies weighted scoring, threshold gating, and loop-gate logic."
    },
    evaluation: selfEvaluation,
    probeDetails: probeResults.map((probe) => ({
      id: probe.id,
      source: probe.source,
      scores: {
        trustworthiness: probe.trustworthiness,
        freshness: probe.freshness,
        consistency: probe.consistency,
        projectedBenefit: probe.projectedBenefit
      },
      detail: probe.detail
    }))
  };
}
