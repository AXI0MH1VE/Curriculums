/**
 * Problem Intake Module
 * ---------------------
 * Create and manage Concepts. Break raw ideas into structured Claims.
 * Initialize validation runs. Manages the INTAKE → VALIDATION transition.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { putEntity, getEntity, listEntities, queryEntities } from "../dataStore.js";
import { assertNonEmptyString, assertArray } from "../validators.js";
import { logAction } from "./audit.js";

const CONCEPT_STATUSES = ["DRAFT", "IN_VALIDATION", "READY_FOR_BUILD", "ON_HOLD", "REJECTED", "IN_DELIVERY"];
const CLAIM_TYPES = ["PROBLEM", "USER_BEHAVIOR", "MARKET", "VALUE_PROPOSITION", "TECH_FEASIBILITY", "RISK"];
const HYPOTHESIS_TYPES = ["ASSUMPTION", "HYPOTHESIS", "FACT"];
const PRIORITY_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/**
 * Create a new Concept.
 */
export function createConcept(input) {
  assertNonEmptyString(input.title, "title");
  assertNonEmptyString(input.summary, "summary");

  const now = new Date().toISOString();
  const concept = {
    concept_id: crypto.randomUUID(),
    owner_id: input.owner_id ?? null,
    title: input.title.trim(),
    summary: input.summary.trim(),
    target_demographic: input.target_demographic ?? "",
    pain_points: Array.isArray(input.pain_points) ? input.pain_points : [],
    desired_outcomes: Array.isArray(input.desired_outcomes) ? input.desired_outcomes : [],
    status: "DRAFT",
    created_at: now,
    updated_at: now
  };

  putEntity("concepts", concept.concept_id, concept);

  // Initialize loop state
  putEntity("loopStates", concept.concept_id, {
    loop_state_id: crypto.randomUUID(),
    concept_id: concept.concept_id,
    stage: "INTAKE",
    updated_at: now
  });

  logAction({
    entity_type: "CONCEPT",
    entity_id: concept.concept_id,
    action: "CREATE",
    details: { title: concept.title, status: concept.status }
  });

  return concept;
}

/**
 * Update an existing Concept.
 */
export function updateConcept(conceptId, updates) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  const allowed = ["title", "summary", "target_demographic", "pain_points", "desired_outcomes", "status"];
  const changes = {};

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      changes[key] = updates[key];
      concept[key] = updates[key];
    }
  }

  concept.updated_at = new Date().toISOString();
  putEntity("concepts", conceptId, concept);

  logAction({
    entity_type: "CONCEPT",
    entity_id: conceptId,
    action: "UPDATE",
    details: changes
  });

  return concept;
}

/**
 * Get a Concept by ID.
 */
export function getConcept(conceptId) {
  return getEntity("concepts", conceptId);
}

/**
 * List all Concepts.
 */
export function listConcepts() {
  return listEntities("concepts");
}

/**
 * Add a Claim to a Concept.
 */
export function addClaim(conceptId, claimInput) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);
  assertNonEmptyString(claimInput.statement, "statement");

  const now = new Date().toISOString();
  const claim = {
    claim_id: crypto.randomUUID(),
    concept_id: conceptId,
    type: CLAIM_TYPES.includes(claimInput.type) ? claimInput.type : "PROBLEM",
    statement: claimInput.statement.trim(),
    hypothesis_type: HYPOTHESIS_TYPES.includes(claimInput.hypothesis_type) ? claimInput.hypothesis_type : "ASSUMPTION",
    priority: PRIORITY_LEVELS.includes(claimInput.priority) ? claimInput.priority : "MEDIUM",
    current_confidence: 0,
    status: "UNVALIDATED",
    notes: claimInput.notes ?? "",
    created_at: now,
    updated_at: now
  };

  putEntity("claims", claim.claim_id, claim);

  logAction({
    entity_type: "CLAIM",
    entity_id: claim.claim_id,
    concept_id: conceptId,
    action: "CREATE",
    details: { statement: claim.statement, type: claim.type, priority: claim.priority }
  });

  return claim;
}

/**
 * Update a Claim.
 */
export function updateClaim(claimId, updates) {
  const claim = getEntity("claims", claimId);
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  const allowed = ["statement", "type", "hypothesis_type", "priority", "current_confidence", "status", "notes"];
  const changes = {};

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      changes[key] = updates[key];
      claim[key] = updates[key];
    }
  }

  claim.updated_at = new Date().toISOString();
  putEntity("claims", claimId, claim);

  logAction({
    entity_type: "CLAIM",
    entity_id: claimId,
    concept_id: claim.concept_id,
    action: "UPDATE",
    details: changes
  });

  return claim;
}

/**
 * Get all Claims for a Concept.
 */
export function getClaimsForConcept(conceptId) {
  return queryEntities("claims", (c) => c.concept_id === conceptId);
}

/**
 * Start a Validation Run for a Concept.
 */
export function startValidationRun(conceptId) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  const now = new Date().toISOString();

  // Update concept status
  concept.status = "IN_VALIDATION";
  concept.updated_at = now;
  putEntity("concepts", conceptId, concept);

  // Create validation run
  const run = {
    run_id: crypto.randomUUID(),
    concept_id: conceptId,
    phase: "EVIDENCE_COLLECTION",
    status: "IN_PROGRESS",
    notes: "",
    created_at: now,
    completed_at: null
  };
  putEntity("validationRuns", run.run_id, run);

  // Update loop state
  const loopState = getEntity("loopStates", conceptId) ?? {
    loop_state_id: crypto.randomUUID(),
    concept_id: conceptId
  };
  loopState.stage = "VALIDATION";
  loopState.updated_at = now;
  putEntity("loopStates", conceptId, loopState);

  logAction({
    entity_type: "VALIDATION_RUN",
    entity_id: run.run_id,
    concept_id: conceptId,
    action: "CREATE",
    details: { phase: run.phase, conceptStatus: "IN_VALIDATION" }
  });

  return run;
}

/**
 * Get the current loop state for a Concept.
 */
export function getLoopState(conceptId) {
  return getEntity("loopStates", conceptId);
}
