/**
 * Delivery Layer Module (Feedback Capture & Iteration Gate)
 * ---------------------------------------------------------
 * Capture post-launch feedback and usage events.
 * Decide when to scale, revise, or remove features.
 * Implements THE LOOP RULE for post-launch iteration.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { putEntity, getEntity, queryEntities, appendToArray } from "../dataStore.js";
import { normalizeScore } from "../validators.js";
import { getActiveModelProfile } from "../modelProfiles.js";
import { logAction } from "./audit.js";

const FEEDBACK_USER_TYPES = ["TARGET_USER", "INTERNAL_TESTER", "STAKEHOLDER"];
const FEEDBACK_SOURCES = ["SURVEY", "INTERVIEW", "SUPPORT_TICKET", "NPS", "USAGE_SESSION"];
const SENTIMENT_VALUES = ["POSITIVE", "NEUTRAL", "NEGATIVE"];
const EVENT_TYPES = ["FEATURE_USED", "ERROR", "ABANDON_STEP", "CONVERSION"];
const DECISION_TYPES = ["KEEP", "SCALE", "REVISE", "REMOVE", "ON_HOLD"];

// ─── Feedback Capture ───────────────────────────────────────

/**
 * Record a piece of user feedback.
 */
export function recordUserFeedback(input) {
  const feedback = {
    feedback_id: crypto.randomUUID(),
    concept_id: input.concept_id ?? null,
    feature_id: input.feature_id ?? null,
    user_type: FEEDBACK_USER_TYPES.includes(input.user_type) ? input.user_type : "TARGET_USER",
    source: FEEDBACK_SOURCES.includes(input.source) ? input.source : "SURVEY",
    rating: typeof input.rating === "number" ? Math.max(1, Math.min(10, Math.round(input.rating))) : null,
    comment: input.comment ?? "",
    sentiment: SENTIMENT_VALUES.includes(input.sentiment) ? input.sentiment : null,
    utility_score: normalizeScore(input.utility_score ?? input.rating / 10 ?? 0.5),
    created_at: new Date().toISOString()
  };

  putEntity("userFeedback", feedback.feedback_id, feedback);

  logAction({
    entity_type: "USER_FEEDBACK",
    entity_id: feedback.feedback_id,
    concept_id: feedback.concept_id,
    action: "CREATE",
    details: {
      feature_id: feedback.feature_id,
      rating: feedback.rating,
      sentiment: feedback.sentiment
    }
  });

  return feedback;
}

/**
 * Record a usage event.
 */
export function recordUsageEvent(input) {
  const event = {
    event_id: crypto.randomUUID(),
    concept_id: input.concept_id ?? null,
    feature_id: input.feature_id ?? null,
    user_id: input.user_id ?? null,
    event_type: EVENT_TYPES.includes(input.event_type) ? input.event_type : "FEATURE_USED",
    properties: input.properties ?? {},
    occurred_at: new Date().toISOString()
  };

  putEntity("usageEvents", event.event_id, event);
  return event;
}

// ─── Feature Health Computation ─────────────────────────────

/**
 * Compute the health score for a feature based on feedback and usage.
 */
export function computeFeatureHealth(featureId) {
  const feedback = queryEntities("userFeedback", (f) => f.feature_id === featureId);
  const usage = queryEntities("usageEvents", (e) => e.feature_id === featureId);

  const feedbackCount = feedback.length;
  const usageCount = usage.length;

  // Average utility score from feedback
  const avgUtility = feedbackCount > 0
    ? feedback.reduce((sum, f) => sum + (f.utility_score ?? 0.5), 0) / feedbackCount
    : 0.5;

  // Average rating
  const ratings = feedback.filter((f) => f.rating !== null);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, f) => sum + f.rating, 0) / ratings.length
    : 5;

  // Sentiment balance
  const positive = feedback.filter((f) => f.sentiment === "POSITIVE").length;
  const negative = feedback.filter((f) => f.sentiment === "NEGATIVE").length;
  const sentimentScore = feedbackCount > 0
    ? (positive - negative) / feedbackCount
    : 0;

  // Usage velocity (events as a proxy for engagement)
  const errors = usage.filter((e) => e.event_type === "ERROR").length;
  const conversions = usage.filter((e) => e.event_type === "CONVERSION").length;
  const abandons = usage.filter((e) => e.event_type === "ABANDON_STEP").length;

  return {
    feature_id: featureId,
    feedbackCount,
    usageCount,
    avgUtility: Number(avgUtility.toFixed(4)),
    avgRating: Number(avgRating.toFixed(1)),
    sentimentScore: Number(sentimentScore.toFixed(4)),
    errors,
    conversions,
    abandons,
    healthScore: Number((avgUtility * 0.6 + normalizeScore(sentimentScore) * 0.2 + normalizeScore(avgRating / 10) * 0.2).toFixed(4))
  };
}

// ─── Iteration Gate ─────────────────────────────────────────

/**
 * Run the Iteration Gate for all features of a concept.
 * Applies THE LOOP RULE:
 * - Evidence + feedback strong → SCALE
 * - Evidence weak or negative → REVISE or REMOVE
 */
export function runIterationGate(conceptId) {
  const concept = getEntity("concepts", conceptId);
  if (!concept) throw new Error(`Concept ${conceptId} not found`);

  const features = queryEntities("features", (f) =>
    f.concept_id === conceptId && f.status !== "REMOVED"
  );

  const profile = getActiveModelProfile();
  const scaleThreshold = profile.config.thresholds.scale;
  const reviseThreshold = profile.config.thresholds.revise;
  const now = new Date().toISOString();

  const decisions = [];

  for (const feature of features) {
    const health = computeFeatureHealth(feature.feature_id);
    let decisionType;
    let reason;

    if (health.healthScore >= scaleThreshold) {
      decisionType = "SCALE";
      reason = `Utility affirmed — health score ${health.healthScore} exceeds scale threshold ${scaleThreshold}.`;
    } else if (health.healthScore >= reviseThreshold) {
      decisionType = "REVISE";
      reason = `Mixed signals — health score ${health.healthScore} between revise (${reviseThreshold}) and scale (${scaleThreshold}) thresholds.`;
    } else if (health.feedbackCount === 0 && health.usageCount === 0) {
      decisionType = "KEEP";
      reason = "No feedback or usage data yet — keep and collect more data.";
    } else {
      decisionType = "REMOVE";
      reason = `Feedback disputes utility — health score ${health.healthScore} below revise threshold ${reviseThreshold}.`;
    }

    const decision = {
      decision_id: crypto.randomUUID(),
      feature_id: feature.feature_id,
      decision_type: decisionType,
      reason,
      evidence_snapshot: {
        healthScore: health.healthScore,
        avgUtility: health.avgUtility,
        sentimentScore: health.sentimentScore,
        feedbackCount: health.feedbackCount,
        usageCount: health.usageCount,
        errors: health.errors,
        conversions: health.conversions
      },
      created_at: now
    };

    putEntity("featureDecisions", decision.decision_id, decision);

    // Apply decision to feature status
    if (decisionType === "SCALE") {
      feature.status = "RELEASED";
    } else if (decisionType === "REVISE") {
      feature.status = "IN_DEVELOPMENT";
    } else if (decisionType === "REMOVE") {
      feature.status = "REMOVED";
    }
    feature.updated_at = now;
    putEntity("features", feature.feature_id, feature);

    decisions.push(decision);

    logAction({
      entity_type: "FEATURE_DECISION",
      entity_id: decision.decision_id,
      concept_id: conceptId,
      action: "DECISION",
      details: {
        feature_id: feature.feature_id,
        feature_name: feature.name,
        decision: decisionType,
        healthScore: health.healthScore
      }
    });
  }

  // Update loop state
  const loopState = getEntity("loopStates", conceptId);
  if (loopState) {
    const scaleCount = decisions.filter((d) => d.decision_type === "SCALE").length;
    const reviseCount = decisions.filter((d) => d.decision_type === "REVISE").length;
    const removeCount = decisions.filter((d) => d.decision_type === "REMOVE").length;

    if (scaleCount > reviseCount + removeCount) {
      loopState.stage = "SCALING";
    } else if (reviseCount + removeCount > 0) {
      loopState.stage = "REVISION";
    } else {
      loopState.stage = "POST_LAUNCH_FEEDBACK";
    }
    loopState.updated_at = now;
    putEntity("loopStates", conceptId, loopState);
  }

  return {
    concept_id: conceptId,
    featureCount: features.length,
    decisions,
    loopStage: getEntity("loopStates", conceptId)?.stage ?? "UNKNOWN",
    summary: {
      scale: decisions.filter((d) => d.decision_type === "SCALE").length,
      revise: decisions.filter((d) => d.decision_type === "REVISE").length,
      remove: decisions.filter((d) => d.decision_type === "REMOVE").length,
      keep: decisions.filter((d) => d.decision_type === "KEEP").length
    }
  };
}

/**
 * Get all feedback for a concept.
 */
export function getFeedbackForConcept(conceptId) {
  return queryEntities("userFeedback", (f) => f.concept_id === conceptId);
}

/**
 * Get all feature decisions for a concept.
 */
export function getDecisionsForConcept(conceptId) {
  return queryEntities("featureDecisions", (d) => {
    const feature = getEntity("features", d.feature_id);
    return feature && feature.concept_id === conceptId;
  });
}
