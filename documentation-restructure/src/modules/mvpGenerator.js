/**
 * MVP Generator Module (Build Layer)
 * -----------------------------------
 * Translate validated Claims → Features.
 * Generate MVPArchitecture (designs, workflows, data model, APIs, tech stack).
 * Rank features by utility.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { putEntity, getEntity, queryEntities } from "../dataStore.js";
import { getActiveModelProfile } from "../modelProfiles.js";
import { getStylePreset } from "../modelConfig.js";
import { assessConceptReadiness } from "./evidenceScorer.js";
import { logAction } from "./audit.js";

/**
 * Generate Feature candidates from validated Claims.
 */
export function generateFeatureCandidates(conceptId) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  const profile = getActiveModelProfile();
  const threshold = profile.config.thresholds.evidenceScore;

  const claims = queryEntities("claims", (c) => c.concept_id === conceptId);
  const validatedClaims = claims.filter((c) => c.current_confidence >= threshold);

  const now = new Date().toISOString();
  const features = [];

  for (const claim of validatedClaims) {
    const feature = {
      feature_id: crypto.randomUUID(),
      concept_id: conceptId,
      name: `${profile.config.generation.featureLabel}: ${claim.statement.slice(0, 80)}`,
      description: claim.statement,
      category: claim.priority === "CRITICAL" ? "CORE" : claim.priority === "HIGH" ? "CORE" : "SUPPORTING",
      status: "CANDIDATE",
      evidence_confidence: claim.current_confidence,
      utility_rank: 0,
      created_at: now,
      updated_at: now
    };

    putEntity("features", feature.feature_id, feature);

    // Link feature to claim
    const link = {
      feature_id: feature.feature_id,
      claim_id: claim.claim_id,
      importance: claim.priority === "CRITICAL" || claim.priority === "HIGH" ? "PRIMARY" : "SECONDARY"
    };
    const links = queryEntities("featureClaimLinks", () => true);
    // Store as entity with composite key
    putEntity("featureClaimLinks", `${feature.feature_id}-${claim.claim_id}`, link);

    features.push(feature);
  }

  logAction({
    entity_type: "FEATURE",
    entity_id: conceptId,
    concept_id: conceptId,
    action: "CREATE",
    details: { featureCandidateCount: features.length }
  });

  return features;
}

/**
 * Rank features by utility (evidence confidence + pain severity + impact).
 */
export function rankFeaturesByUtility(conceptId) {
  const features = queryEntities("features", (f) => f.concept_id === conceptId);

  features.sort((a, b) => {
    // Primary sort: evidence confidence descending
    if (b.evidence_confidence !== a.evidence_confidence) {
      return b.evidence_confidence - a.evidence_confidence;
    }
    // Secondary sort: CORE before SUPPORTING before NICE_TO_HAVE
    const categoryOrder = { CORE: 0, SUPPORTING: 1, NICE_TO_HAVE: 2 };
    return (categoryOrder[a.category] ?? 2) - (categoryOrder[b.category] ?? 2);
  });

  for (let i = 0; i < features.length; i++) {
    features[i].utility_rank = i + 1;
    features[i].updated_at = new Date().toISOString();
    putEntity("features", features[i].feature_id, features[i]);
  }

  return features;
}

/**
 * Select the top MVP features.
 */
export function selectMVPFeatures(conceptId) {
  const profile = getActiveModelProfile();
  const maxFeatures = profile.config.generation.maxFeatures;
  const ranked = rankFeaturesByUtility(conceptId);

  const selected = ranked.slice(0, maxFeatures);
  const deselected = ranked.slice(maxFeatures);

  for (const f of selected) {
    f.status = "SELECTED_FOR_MVP";
    f.category = f.utility_rank <= Math.ceil(maxFeatures / 2) ? "CORE" : "SUPPORTING";
    f.updated_at = new Date().toISOString();
    putEntity("features", f.feature_id, f);
  }

  for (const f of deselected) {
    f.status = "CANDIDATE";
    f.category = "NICE_TO_HAVE";
    f.updated_at = new Date().toISOString();
    putEntity("features", f.feature_id, f);
  }

  logAction({
    entity_type: "FEATURE",
    entity_id: conceptId,
    concept_id: conceptId,
    action: "STATUS_CHANGE",
    details: {
      selectedForMVP: selected.length,
      deselected: deselected.length,
      maxFeatures
    }
  });

  return selected;
}

/**
 * Get all features for a concept.
 */
export function getFeaturesForConcept(conceptId) {
  return queryEntities("features", (f) => f.concept_id === conceptId)
    .sort((a, b) => a.utility_rank - b.utility_rank);
}

/**
 * Create a full MVP Architecture for a concept.
 */
export function createMVPArchitecture(conceptId) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  // Assess readiness first
  const readiness = assessConceptReadiness(conceptId);
  if (!readiness.ready) {
    return {
      error: true,
      decision: readiness.decision,
      details: readiness.details,
      mvpArchitecture: null
    };
  }

  // Generate and select features
  const existingFeatures = queryEntities("features", (f) => f.concept_id === conceptId);
  if (existingFeatures.length === 0) {
    generateFeatureCandidates(conceptId);
  }
  const selectedFeatures = selectMVPFeatures(conceptId);

  const profile = getActiveModelProfile();
  const stylePreset = getStylePreset(profile.config.generation.style);
  const now = new Date().toISOString();

  // Check for existing architecture and bump version
  const existingMVPs = queryEntities("mvpArchitectures", (m) => m.concept_id === conceptId);
  const version = existingMVPs.length + 1;

  // Deprecate previous architectures
  for (const old of existingMVPs) {
    old.status = "DEPRECATED";
    old.updated_at = now;
    putEntity("mvpArchitectures", old.mvp_id, old);
  }

  const mvp = {
    mvp_id: crypto.randomUUID(),
    concept_id: conceptId,
    version,
    status: "DRAFT",
    summary: `MVP Architecture v${version} for "${concept.title}" — ${selectedFeatures.length} validated features.`,
    interfaces: stylePreset.interfaces,
    workflows: stylePreset.workflows,
    data_objects: stylePreset.dataObjects,
    api_needs: ["/v1/evaluate", "/v1/feedback", "/v1/claims/:id"],
    tech_stack: {
      frontend: "Vanilla HTML/CSS/JS",
      backend: "Node.js + Express",
      database: "JSON file store (local-first)",
      infrastructure: "Electron desktop / npm start",
      observability: "Built-in self-validation probes"
    },
    feature_hierarchy: selectedFeatures.map((f) => ({
      rank: f.utility_rank,
      feature: f.name,
      confidence: f.evidence_confidence,
      category: f.category
    })),
    created_at: now,
    updated_at: now
  };

  putEntity("mvpArchitectures", mvp.mvp_id, mvp);

  // Update concept status
  concept.status = "IN_DELIVERY";
  concept.updated_at = now;
  putEntity("concepts", conceptId, concept);

  // Update loop state
  const loopState = getEntity("loopStates", conceptId);
  if (loopState) {
    loopState.stage = "MVP_BUILD";
    loopState.updated_at = now;
    putEntity("loopStates", conceptId, loopState);
  }

  logAction({
    entity_type: "MVP_ARCHITECTURE",
    entity_id: mvp.mvp_id,
    concept_id: conceptId,
    action: "MVP_GENERATED",
    details: {
      version,
      featureCount: selectedFeatures.length,
      style: profile.config.generation.style
    }
  });

  return {
    error: false,
    decision: "BUILD_MINIMUM_FUNCTIONAL_VERSION",
    readiness: readiness.details,
    mvpArchitecture: mvp
  };
}
