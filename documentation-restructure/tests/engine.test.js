import test from "node:test";
import assert from "node:assert/strict";
import { evaluateConcept, evaluatePostLaunchFeedback } from "../src/engine.js";

test("evaluateConcept stops development when no claims meet threshold", () => {
  const result = evaluateConcept({
    concept: "AI assistant for job seekers",
    targetDemographic: "entry-level developers",
    painPoints: ["resume uncertainty"],
    desiredOutcomes: ["submit stronger applications"],
    claims: [
      {
        statement: "Users need automated resume formatting",
        evidence: [
          {
            source: "single forum post",
            trustworthiness: 0.2,
            freshness: 0.3,
            consistency: 0.25,
            projectedBenefit: 0.3
          }
        ]
      }
    ]
  });

  assert.equal(result.loopGateDecision, "STOP_AND_REVALIDATE");
  assert.equal(result.decisionSummary.shouldStopFeatureDevelopment, true);
  assert.equal(result.mvpArchitecture.interfaces.length, 0);
});

test("evaluateConcept generates minimum architecture when evidence is strong", () => {
  const result = evaluateConcept({
    concept: "Operations dashboard for solo founders",
    targetDemographic: "solo SaaS operators",
    painPoints: ["fragmented KPI visibility", "delayed customer signal review"],
    desiredOutcomes: ["centralized decisions", "faster iteration"],
    claims: [
      {
        statement: "Operators benefit from a single triage dashboard",
        evidence: [
          {
            source: "industry benchmark report",
            trustworthiness: 0.9,
            freshness: 0.8,
            consistency: 0.85,
            projectedBenefit: 0.95
          },
          {
            source: "user interviews",
            trustworthiness: 0.8,
            freshness: 0.8,
            consistency: 0.8,
            projectedBenefit: 0.9
          }
        ]
      }
    ]
  });

  assert.equal(result.loopGateDecision, "BUILD_MINIMUM_FUNCTIONAL_VERSION");
  assert.equal(result.decisionSummary.shouldStopFeatureDevelopment, false);
  assert.ok(result.evidenceBasedFeatureHierarchy.length > 0);
  assert.ok(result.mvpArchitecture.workflows.length > 0);
});

test("evaluatePostLaunchFeedback returns scale decision for high utility", () => {
  const result = evaluatePostLaunchFeedback({
    feedbackSignals: [{ utilityScore: 0.9 }, { utilityScore: 0.8 }, { utilityScore: 0.75 }]
  });

  assert.equal(result.action, "SCALE");
});

test("evaluatePostLaunchFeedback returns remove decision for low utility", () => {
  const result = evaluatePostLaunchFeedback({
    feedbackSignals: [{ utilityScore: 0.2 }, { utilityScore: 0.35 }, { utilityScore: 0.4 }]
  });

  assert.equal(result.action, "REMOVE_OR_REVALIDATE");
});

test("evaluateConcept blocks release in strict mode when any claim remains insufficient", () => {
  const result = evaluateConcept(
    {
      concept: "Operator workspace",
      targetDemographic: "product teams",
      painPoints: ["late validation"],
      desiredOutcomes: ["faster proof of utility"],
      claims: [
        {
          statement: "A command center improves launch quality",
          evidence: [
            {
              source: "benchmark report",
              trustworthiness: 0.9,
              freshness: 0.8,
              consistency: 0.9,
              projectedBenefit: 0.9
            }
          ]
        },
        {
          statement: "Gamified badges increase retention",
          evidence: [
            {
              source: "single anecdote",
              trustworthiness: 0.2,
              freshness: 0.3,
              consistency: 0.2,
              projectedBenefit: 0.3
            }
          ]
        }
      ]
    },
    {
      modelConfig: {
        generation: {
          strictMode: true
        }
      }
    }
  );

  assert.equal(result.decisionSummary.strictModeBlocked, true);
  assert.equal(result.loopGateDecision, "STOP_DUE_TO_STRICT_MODE");
});
