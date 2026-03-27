import test from "node:test";
import assert from "node:assert/strict";
import { normalizeModelConfig, validateProfileName } from "../src/modelConfig.js";

test("normalizeModelConfig normalizes weights and bounds generation settings", () => {
  const normalized = normalizeModelConfig({
    weights: {
      trustworthiness: 5,
      freshness: 5,
      consistency: 0,
      projectedBenefit: 0
    },
    generation: {
      maxFeatures: 42,
      style: "unknown-style",
      featureLabel: "Priority"
    }
  });

  const weightTotal =
    normalized.weights.trustworthiness +
    normalized.weights.freshness +
    normalized.weights.consistency +
    normalized.weights.projectedBenefit;

  assert.equal(Number(weightTotal.toFixed(4)), 1);
  assert.equal(normalized.generation.maxFeatures, 12);
  assert.equal(normalized.generation.style, "minimalist");
  assert.equal(normalized.generation.featureLabel, "Priority");
});

test("normalizeModelConfig keeps revise threshold below scale threshold", () => {
  const normalized = normalizeModelConfig({
    thresholds: {
      scale: 0.4,
      revise: 0.9
    }
  });

  assert.ok(normalized.thresholds.revise < normalized.thresholds.scale);
});

test("validateProfileName rejects unsafe profile names", () => {
  assert.throws(() => validateProfileName("not valid"), /profile name can contain letters/);
});
