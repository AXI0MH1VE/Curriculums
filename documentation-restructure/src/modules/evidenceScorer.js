/**
 * Evidence Scorer Module
 * ----------------------
 * Compute EvidenceScore and Claim-level confidence.
 * Implement the weak vs strong evidence rule (THE LOOP RULE).
 * Assess concept readiness for MVP generation.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { putEntity, getEntity, queryEntities } from "../dataStore.js";
import { normalizeScore } from "../validators.js";
import { getActiveModelProfile } from "../modelProfiles.js";
import { logAction } from "./audit.js";

/**
 * Score a single Evidence Item and persist the score.
 */
export function scoreEvidence(evidenceId) {
  const evidence = getEntity("evidenceItems", evidenceId);
  if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);

  const profile = getActiveModelProfile();
  const weights = profile.config.weights;

  const trust = normalizeScore(evidence.trustworthiness);
  const fresh = normalizeScore(evidence.freshness);
  const consist = normalizeScore(evidence.consistency);
  const benefit = normalizeScore(evidence.projectedBenefit);

  const compositeScore =
    trust * weights.trustworthiness +
    fresh * weights.freshness +
    consist * weights.consistency +
    benefit * weights.projectedBenefit;

  const score = {
    score_id: crypto.randomUUID(),
    claim_id: evidence.claim_id,
    evidence_id: evidenceId,
    trust_weight: Number((trust * weights.trustworthiness).toFixed(4)),
    freshness_weight: Number((fresh * weights.freshness).toFixed(4)),
    consistency_weight: Number((consist * weights.consistency).toFixed(4)),
    benefit_weight: Number((benefit * weights.projectedBenefit).toFixed(4)),
    composite_score: Number(compositeScore.toFixed(4)),
    created_at: new Date().toISOString()
  };

  putEntity("evidenceScores", score.score_id, score);
  return score;
}

/**
 * Recalculate the confidence for a Claim based on all its evidence scores.
 */
export function recalculateClaimConfidence(claimId) {
  const claim = getEntity("claims", claimId);
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  // Get all evidence for this claim
  const evidenceItems = queryEntities("evidenceItems", (e) => e.claim_id === claimId);

  if (evidenceItems.length === 0) {
    claim.current_confidence = 0;
    claim.status = "UNVALIDATED";
    claim.updated_at = new Date().toISOString();
    putEntity("claims", claimId, claim);
    return claim;
  }

  // Score any unscored evidence
  for (const ev of evidenceItems) {
    const existingScores = queryEntities("evidenceScores", (s) => s.evidence_id === ev.evidence_id);
    if (existingScores.length === 0) {
      scoreEvidence(ev.evidence_id);
    }
  }

  // Aggregate all evidence scores for this claim
  const allScores = queryEntities("evidenceScores", (s) => s.claim_id === claimId);
  if (allScores.length === 0) {
    claim.current_confidence = 0;
    claim.updated_at = new Date().toISOString();
    putEntity("claims", claimId, claim);
    return claim;
  }

  const avgComposite = allScores.reduce((sum, s) => sum + s.composite_score, 0) / allScores.length;
  claim.current_confidence = Number(avgComposite.toFixed(4));

  const profile = getActiveModelProfile();
  const threshold = profile.config.thresholds.evidenceScore;

  claim.status = claim.current_confidence >= threshold ? "VALIDATED" : "VALIDATING";
  claim.updated_at = new Date().toISOString();
  putEntity("claims", claimId, claim);

  logAction({
    entity_type: "CLAIM",
    entity_id: claimId,
    concept_id: claim.concept_id,
    action: "STATUS_CHANGE",
    details: {
      current_confidence: claim.current_confidence,
      status: claim.status,
      threshold,
      evidence_count: allScores.length
    }
  });

  return claim;
}

/**
 * Assess whether a Concept is ready for MVP build.
 *
 * Logic (THE LOOP RULE):
 * - All CRITICAL claims must have confidence >= threshold
 * - At least one claim must be VALIDATED
 * - If strict mode: ALL claims must be validated
 *
 * @returns {{ ready: boolean, decision: string, details: Object }}
 */
export function assessConceptReadiness(conceptId) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  const claims = queryEntities("claims", (c) => c.concept_id === conceptId);
  const profile = getActiveModelProfile();
  const threshold = profile.config.thresholds.evidenceScore;
  const strictMode = profile.config.generation.strictMode;

  if (claims.length === 0) {
    return {
      ready: false,
      decision: "NO_CLAIMS",
      details: { message: "No claims found for this concept. Add claims and evidence first." }
    };
  }

  // Recalculate confidence for all claims
  for (const claim of claims) {
    recalculateClaimConfidence(claim.claim_id);
  }

  // Re-read claims after recalculation
  const updatedClaims = queryEntities("claims", (c) => c.concept_id === conceptId);

  const validated = updatedClaims.filter((c) => c.current_confidence >= threshold);
  const insufficient = updatedClaims.filter((c) => c.current_confidence < threshold);
  const criticalInsufficient = insufficient.filter((c) => c.priority === "CRITICAL");

  // THE LOOP RULE enforcement
  const strictModeBlocked = strictMode && insufficient.length > 0;
  const criticalBlocked = criticalInsufficient.length > 0;
  const noValidated = validated.length === 0;

  let ready = true;
  let decision = "READY_FOR_BUILD";

  if (noValidated) {
    ready = false;
    decision = "STOPPED_WEAK_EVIDENCE";
  } else if (criticalBlocked) {
    ready = false;
    decision = "STOPPED_CRITICAL_UNVALIDATED";
  } else if (strictModeBlocked) {
    ready = false;
    decision = "STOPPED_STRICT_MODE";
  }

  // Update concept and loop state
  const now = new Date().toISOString();

  if (ready) {
    concept.status = "READY_FOR_BUILD";
    // Close active validation run
    const runs = queryEntities("validationRuns", (r) => r.concept_id === conceptId && r.status === "IN_PROGRESS");
    for (const run of runs) {
      run.status = "COMPLETED";
      run.completed_at = now;
      putEntity("validationRuns", run.run_id, run);
    }
  } else {
    // Update loop state to STOPPED
    const loopState = getEntity("loopStates", conceptId);
    if (loopState) {
      loopState.stage = "STOPPED_WEAK_EVIDENCE";
      loopState.updated_at = now;
      putEntity("loopStates", conceptId, loopState);
    }
  }

  concept.updated_at = now;
  putEntity("concepts", conceptId, concept);

  logAction({
    entity_type: "CONCEPT",
    entity_id: conceptId,
    action: "DECISION",
    details: {
      decision,
      totalClaims: updatedClaims.length,
      validatedClaims: validated.length,
      insufficientClaims: insufficient.length,
      criticalInsufficient: criticalInsufficient.length,
      threshold,
      strictMode
    }
  });

  return {
    ready,
    decision,
    details: {
      totalClaims: updatedClaims.length,
      validatedClaims: validated.length,
      insufficientClaims: insufficient.length,
      criticalInsufficient: criticalInsufficient.length,
      threshold,
      strictMode,
      claimDetails: updatedClaims.map((c) => ({
        claim_id: c.claim_id,
        statement: c.statement,
        priority: c.priority,
        confidence: c.current_confidence,
        status: c.status
      }))
    }
  };
}
