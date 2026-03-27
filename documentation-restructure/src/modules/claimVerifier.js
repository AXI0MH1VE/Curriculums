/**
 * Claim Verifier Module (Validation Layer)
 * -----------------------------------------
 * Attach EvidenceItems to Claims. Register EvidenceSources.
 * Normalize external data into the evidence schema.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { putEntity, getEntity, queryEntities, listEntities } from "../dataStore.js";
import { assertNonEmptyString, normalizeScore } from "../validators.js";
import { logAction } from "./audit.js";

const SOURCE_TYPES = ["REPORT", "PEER_REVIEW", "SURVEY", "INTERVIEW", "ANALYTICS", "COMPETITOR", "MARKET_RESEARCH"];
const FRESHNESS_LEVELS = ["VERY_RECENT", "RECENT", "OLD"];
const CONSISTENCY_DIRECTIONS = ["SUPPORTS", "NEUTRAL", "CONTRADICTS"];
const COLLECTION_METHODS = ["MANUAL_UPLOAD", "INTEGRATION", "SURVEY_TOOL", "INTERVIEW_NOTE", "ANALYTICS_PIPELINE"];

/**
 * Register a new Evidence Source.
 */
export function registerEvidenceSource(input) {
  assertNonEmptyString(input.name, "name");

  const source = {
    source_id: crypto.randomUUID(),
    name: input.name.trim(),
    type: SOURCE_TYPES.includes(input.type) ? input.type : "REPORT",
    organization: input.organization ?? null,
    url: input.url ?? null,
    default_trust_score: normalizeScore(input.default_trust_score ?? 0.5),
    created_at: new Date().toISOString()
  };

  putEntity("evidenceSources", source.source_id, source);

  logAction({
    entity_type: "EVIDENCE_SOURCE",
    entity_id: source.source_id,
    action: "CREATE",
    details: { name: source.name, type: source.type }
  });

  return source;
}

/**
 * List all Evidence Sources.
 */
export function listEvidenceSources() {
  return listEntities("evidenceSources");
}

/**
 * Add Evidence to a Claim.
 */
export function addEvidence(claimId, evidenceInput) {
  const claim = getEntity("claims", claimId);
  if (!claim) throw new Error(`Claim ${claimId} not found`);
  assertNonEmptyString(evidenceInput.summary, "summary");

  const source = evidenceInput.source_id
    ? getEntity("evidenceSources", evidenceInput.source_id)
    : null;

  const evidence = {
    evidence_id: crypto.randomUUID(),
    claim_id: claimId,
    source_id: evidenceInput.source_id ?? null,
    summary: evidenceInput.summary.trim(),
    raw_reference: evidenceInput.raw_reference ?? null,
    data_freshness: FRESHNESS_LEVELS.includes(evidenceInput.data_freshness)
      ? evidenceInput.data_freshness
      : "RECENT",
    consistency_direction: CONSISTENCY_DIRECTIONS.includes(evidenceInput.consistency_direction)
      ? evidenceInput.consistency_direction
      : "SUPPORTS",
    sample_size: typeof evidenceInput.sample_size === "number" ? evidenceInput.sample_size : null,
    collected_via: COLLECTION_METHODS.includes(evidenceInput.collected_via)
      ? evidenceInput.collected_via
      : "MANUAL_UPLOAD",
    // Normalized scoring dimensions for the scoring engine
    trustworthiness: normalizeScore(
      evidenceInput.trustworthiness ?? source?.default_trust_score ?? 0.5
    ),
    freshness: normalizeScore(evidenceInput.freshness ?? freshnessToScore(evidenceInput.data_freshness)),
    consistency: normalizeScore(evidenceInput.consistency ?? consistencyToScore(evidenceInput.consistency_direction)),
    projectedBenefit: normalizeScore(evidenceInput.projectedBenefit ?? 0.5),
    created_at: new Date().toISOString()
  };

  putEntity("evidenceItems", evidence.evidence_id, evidence);

  logAction({
    entity_type: "EVIDENCE_ITEM",
    entity_id: evidence.evidence_id,
    concept_id: claim.concept_id,
    action: "EVIDENCE_ADDED",
    details: {
      claim_id: claimId,
      summary: evidence.summary,
      consistency_direction: evidence.consistency_direction,
      data_freshness: evidence.data_freshness
    }
  });

  return evidence;
}

/**
 * Get all Evidence Items for a Claim.
 */
export function getEvidenceForClaim(claimId) {
  return queryEntities("evidenceItems", (e) => e.claim_id === claimId);
}

/**
 * Link one Evidence Item to multiple Claims.
 */
export function linkEvidenceToMultipleClaims(evidenceId, claimIds) {
  const evidence = getEntity("evidenceItems", evidenceId);
  if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);

  const results = [];
  for (const claimId of claimIds) {
    const claim = getEntity("claims", claimId);
    if (!claim) continue;

    // Create a copy linked to this claim
    const linked = {
      ...evidence,
      evidence_id: crypto.randomUUID(),
      claim_id: claimId,
      linked_from: evidenceId,
      created_at: new Date().toISOString()
    };
    putEntity("evidenceItems", linked.evidence_id, linked);
    results.push(linked);
  }

  return results;
}

// ─── Helpers ────────────────────────────────────────────────

function freshnessToScore(level) {
  switch (level) {
    case "VERY_RECENT": return 0.95;
    case "RECENT": return 0.7;
    case "OLD": return 0.35;
    default: return 0.7;
  }
}

function consistencyToScore(direction) {
  switch (direction) {
    case "SUPPORTS": return 0.9;
    case "NEUTRAL": return 0.5;
    case "CONTRADICTS": return 0.15;
    default: return 0.5;
  }
}
