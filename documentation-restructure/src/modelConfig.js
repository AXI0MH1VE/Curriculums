import { clamp, normalizeScore } from "./validators.js";

export const DEFAULT_MODEL_CONFIG = {
  weights: {
    trustworthiness: 0.35,
    freshness: 0.2,
    consistency: 0.25,
    projectedBenefit: 0.2
  },
  thresholds: {
    evidenceScore: 0.65,
    scale: 0.7,
    revise: 0.45
  },
  generation: {
    style: "minimalist",
    maxFeatures: 5,
    includeRiskRegister: true,
    strictMode: false,
    featureLabel: "Feature"
  }
};

const STYLE_PRESETS = {
  minimalist: {
    interfaces: ["intake-studio", "signal-board", "feedback-pulse"],
    workflows: [
      "capture-problem-and-claims",
      "run-weighted-evidence-scoring",
      "compose-minimum-feature-architecture",
      "gate-scaling-with-feedback-signals"
    ],
    dataObjects: ["Concept", "Claim", "EvidenceItem", "FeatureCandidate", "FeedbackRecord"]
  },
  executive: {
    interfaces: ["operator-console", "decision-matrix", "iteration-briefing"],
    workflows: [
      "compile-opportunity-brief",
      "validate-claims-with-third-party-evidence",
      "prioritize-roi-aligned-feature-set",
      "execute-governed-feedback-iteration"
    ],
    dataObjects: ["Concept", "Claim", "EvidencePacket", "MvpDecision", "FeedbackSignal"]
  },
  technical: {
    interfaces: ["schema-intake-panel", "confidence-analyzer", "release-gate-monitor"],
    workflows: [
      "ingest-claims-and-source-metadata",
      "score-claims-through-normalized-weights",
      "emit-constrained-mvp-system-spec",
      "reconcile-behavioral-metrics-and-decisions"
    ],
    dataObjects: ["Concept", "Claim", "EvidenceItem", "ArchitectureSpec", "TelemetryFeedback"]
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeWeights(weights = {}) {
  const trustworthiness = normalizeScore(weights.trustworthiness ?? DEFAULT_MODEL_CONFIG.weights.trustworthiness);
  const freshness = normalizeScore(weights.freshness ?? DEFAULT_MODEL_CONFIG.weights.freshness);
  const consistency = normalizeScore(weights.consistency ?? DEFAULT_MODEL_CONFIG.weights.consistency);
  const projectedBenefit = normalizeScore(
    weights.projectedBenefit ?? DEFAULT_MODEL_CONFIG.weights.projectedBenefit
  );

  const total = trustworthiness + freshness + consistency + projectedBenefit;
  if (total === 0) {
    return deepClone(DEFAULT_MODEL_CONFIG.weights);
  }

  return {
    trustworthiness: Number((trustworthiness / total).toFixed(4)),
    freshness: Number((freshness / total).toFixed(4)),
    consistency: Number((consistency / total).toFixed(4)),
    projectedBenefit: Number((projectedBenefit / total).toFixed(4))
  };
}

function normalizeThresholds(thresholds = {}) {
  const evidenceScore = normalizeScore(thresholds.evidenceScore ?? DEFAULT_MODEL_CONFIG.thresholds.evidenceScore);
  const scale = normalizeScore(thresholds.scale ?? DEFAULT_MODEL_CONFIG.thresholds.scale);
  const reviseInput = normalizeScore(thresholds.revise ?? DEFAULT_MODEL_CONFIG.thresholds.revise);
  const revise = Math.min(reviseInput, Number((scale - 0.01).toFixed(4)));

  return {
    evidenceScore,
    scale,
    revise: revise >= 0 ? revise : DEFAULT_MODEL_CONFIG.thresholds.revise
  };
}

function normalizeGeneration(generation = {}) {
  const style = String(generation.style ?? DEFAULT_MODEL_CONFIG.generation.style).toLowerCase();
  const maxFeaturesInput = Number(generation.maxFeatures ?? DEFAULT_MODEL_CONFIG.generation.maxFeatures);
  const maxFeatures = Number.isNaN(maxFeaturesInput)
    ? DEFAULT_MODEL_CONFIG.generation.maxFeatures
    : Math.round(clamp(1, 12, maxFeaturesInput));
  const includeRiskRegister =
    typeof generation.includeRiskRegister === "boolean"
      ? generation.includeRiskRegister
      : DEFAULT_MODEL_CONFIG.generation.includeRiskRegister;
  const strictMode =
    typeof generation.strictMode === "boolean" ? generation.strictMode : DEFAULT_MODEL_CONFIG.generation.strictMode;
  const featureLabelInput = generation.featureLabel ?? DEFAULT_MODEL_CONFIG.generation.featureLabel;
  const featureLabel =
    typeof featureLabelInput === "string" && featureLabelInput.trim().length > 0
      ? featureLabelInput.trim()
      : DEFAULT_MODEL_CONFIG.generation.featureLabel;

  return {
    style: STYLE_PRESETS[style] ? style : DEFAULT_MODEL_CONFIG.generation.style,
    maxFeatures,
    includeRiskRegister,
    strictMode,
    featureLabel
  };
}

export function normalizeModelConfig(input = {}) {
  return {
    weights: normalizeWeights(input.weights),
    thresholds: normalizeThresholds(input.thresholds),
    generation: normalizeGeneration(input.generation)
  };
}

export function getStylePreset(style) {
  return STYLE_PRESETS[style] ?? STYLE_PRESETS[DEFAULT_MODEL_CONFIG.generation.style];
}

export function validateProfileName(name) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error("profile name must be at least 2 characters");
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(name)) {
    throw new Error("profile name can contain letters, numbers, dash, and underscore only");
  }
}
