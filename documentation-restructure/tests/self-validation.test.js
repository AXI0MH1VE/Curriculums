import test from "node:test";
import assert from "node:assert/strict";
import { runSelfValidation } from "../src/selfValidation.js";

test("self-validation produces a complete legitimacy report with all probes passing", () => {
  const report = runSelfValidation();

  // Meta section
  assert.ok(report.meta, "report must contain meta section");
  assert.equal(typeof report.meta.timestamp, "string");
  assert.equal(report.meta.probeCount, 7);
  assert.equal(report.meta.probePassRate, 1, "all probes must pass at 100%");

  // Evaluation section — the system ate its own cooking
  assert.ok(report.evaluation, "report must contain evaluation section");
  assert.equal(report.evaluation.loopGateDecision, "BUILD_MINIMUM_FUNCTIONAL_VERSION",
    "self-evaluation must pass its own gate — if it does not, the system failed to prove its own utility");

  // Decision summary
  const ds = report.evaluation.decisionSummary;
  assert.equal(ds.totalClaims, 7);
  assert.equal(ds.validatedClaims, 7, "all 7 claims must be validated by functional evidence");
  assert.equal(ds.insufficientClaims, 0, "zero claims should be insufficient");
  assert.equal(ds.shouldStopFeatureDevelopment, false);

  // Feature hierarchy — every validated claim surfaces
  assert.equal(report.evaluation.evidenceBasedFeatureHierarchy.length, 5,
    "feature hierarchy capped by maxFeatures default (5)");

  // No risk register entries — all claims passed
  assert.equal(report.evaluation.riskRegister.length, 0,
    "risk register must be empty when all claims are validated");

  // Probe details contain functional execution evidence
  assert.equal(report.probeDetails.length, 7);
  for (const probe of report.probeDetails) {
    assert.ok(probe.id, "each probe must have an id");
    assert.ok(probe.source.startsWith("live system execution"), 
      `probe ${probe.id} source must indicate live execution, got: ${probe.source}`);
    assert.ok(probe.detail && typeof probe.detail === "object",
      `probe ${probe.id} must include execution detail`);
    assert.ok(probe.scores.trustworthiness >= 0.9,
      `probe ${probe.id} trustworthiness must be >= 0.9`);
    assert.ok(probe.scores.consistency >= 0.9,
      `probe ${probe.id} consistency must be >= 0.9`);
  }
});

test("self-validation claim ledger entries all carry evidence from functional probes", () => {
  const report = runSelfValidation();

  for (const claim of report.evaluation.claimLedger) {
    assert.ok(claim.evidenceBreakdown.length > 0, 
      `claim "${claim.statement}" must have at least one evidence item`);
    for (const ev of claim.evidenceBreakdown) {
      assert.ok(ev.source.startsWith("live system execution"),
        `evidence source must be a live probe, got: ${ev.source}`);
      assert.ok(ev.score > 0, "evidence score must be positive (non-trivial functional result)");
    }
  }
});

test("self-validation uses the same scoring logic as external evaluations", () => {
  const report = runSelfValidation();

  // Verify the same threshold is applied
  const ds = report.evaluation.decisionSummary;
  assert.ok(ds.scoreThreshold > 0, "score threshold must be present");
  assert.ok(ds.scoreThreshold <= 1, "score threshold must be in [0, 1]");

  // Every validated claim must have a score >= threshold
  for (const claim of report.evaluation.claimLedger) {
    if (claim.decision === "validated") {
      assert.ok(claim.evidenceScore >= ds.scoreThreshold,
        `validated claim "${claim.statement}" score (${claim.evidenceScore}) must be >= threshold (${ds.scoreThreshold})`);
    }
  }
});
