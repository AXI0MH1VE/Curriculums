/**
 * Utility Prioritizer Module
 * --------------------------
 * Continuously ensure only validated, high-utility features remain in scope.
 * Enforce MVP minimalism. Strip non-essential features.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import { putEntity, queryEntities } from "../dataStore.js";
import { getActiveModelProfile } from "../modelProfiles.js";
import { logAction } from "./audit.js";

/**
 * Recompute feature utility for all features in a concept.
 * Rebuilds utility_rank based on evidence confidence and category.
 */
export function recomputeFeatureUtility(conceptId) {
  const features = queryEntities("features", (f) => f.concept_id === conceptId);
  if (features.length === 0) return [];

  features.sort((a, b) => {
    // Primary: evidence confidence descending
    if (b.evidence_confidence !== a.evidence_confidence) {
      return b.evidence_confidence - a.evidence_confidence;
    }
    // Secondary: category order
    const order = { CORE: 0, SUPPORTING: 1, NICE_TO_HAVE: 2 };
    return (order[a.category] ?? 2) - (order[b.category] ?? 2);
  });

  const now = new Date().toISOString();
  for (let i = 0; i < features.length; i++) {
    features[i].utility_rank = i + 1;
    features[i].updated_at = now;
    putEntity("features", features[i].feature_id, features[i]);
  }

  return features;
}

/**
 * Prune low-utility features below a confidence threshold.
 * Moves them to REMOVED or ON_HOLD status.
 */
export function pruneLowUtilityFeatures(conceptId, threshold) {
  const profile = getActiveModelProfile();
  const effectiveThreshold = threshold ?? profile.config.thresholds.evidenceScore;

  const features = queryEntities("features", (f) => f.concept_id === conceptId);
  const pruned = [];
  const kept = [];

  const now = new Date().toISOString();
  for (const feature of features) {
    if (feature.evidence_confidence < effectiveThreshold && feature.status !== "REMOVED") {
      feature.status = "REMOVED";
      feature.updated_at = now;
      putEntity("features", feature.feature_id, feature);
      pruned.push(feature);
    } else {
      kept.push(feature);
    }
  }

  if (pruned.length > 0) {
    logAction({
      entity_type: "FEATURE",
      entity_id: conceptId,
      concept_id: conceptId,
      action: "STATUS_CHANGE",
      details: {
        action: "PRUNE_LOW_UTILITY",
        pruned: pruned.length,
        kept: kept.length,
        threshold: effectiveThreshold
      }
    });
  }

  return { pruned, kept, threshold: effectiveThreshold };
}

/**
 * Mark the top N features as CORE MVP features.
 */
export function markCoreMVPFeatures(conceptId, count) {
  const profile = getActiveModelProfile();
  const effectiveCount = count ?? profile.config.generation.maxFeatures;
  const ranked = recomputeFeatureUtility(conceptId);

  const now = new Date().toISOString();
  const core = [];
  const supporting = [];

  for (let i = 0; i < ranked.length; i++) {
    const f = ranked[i];
    if (i < effectiveCount && f.status !== "REMOVED") {
      f.category = "CORE";
      f.status = "SELECTED_FOR_MVP";
    } else if (f.status !== "REMOVED") {
      f.category = "SUPPORTING";
      f.status = "CANDIDATE";
    }
    f.updated_at = now;
    putEntity("features", f.feature_id, f);

    if (f.category === "CORE") core.push(f);
    else supporting.push(f);
  }

  return { core, supporting };
}
