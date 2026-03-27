import test from "node:test";
import assert from "node:assert/strict";
import { generateKnowledgeBaseWorkflow, getKnowledgeBaseWorkflowTemplate } from "../src/kbProtocol.js";

test("generateKnowledgeBaseWorkflow returns ladder artifact with attribution and workflow rows", () => {
  const artifact = generateKnowledgeBaseWorkflow({
    problemContext: "Knowledge Base outputs are inconsistent and attribution handling is not standardized.",
    attribution: {
      entity: "AXIOM HIVE XPII",
      creators: ["Nicholas Michael Grossi", "Alexis Adams"],
      operator: "NMG"
    },
    requestedConstraints: {
      human_in_command: true,
      transparency_requirements: true
    },
    sources: ["Comprehensive Institutional Communication Protocol"]
  });

  assert.equal(artifact.ladder.problem.title, "Definitive Problem Statement");
  assert.equal(artifact.attribution.entity, "AXIOM HIVE XPII");
  assert.equal(artifact.attribution.creators.length, 2);
  assert.equal(artifact.workflowArtifact.length, 3);
  assert.equal(artifact.operatorControl.singleSourceOfTruth, "NMG");
});

test("generateKnowledgeBaseWorkflow flags no_refusal as a conflict", () => {
  const artifact = generateKnowledgeBaseWorkflow({
    problemContext: "Need strict protocol compatibility map.",
    requestedConstraints: {
      no_refusal: true
    }
  });

  assert.equal(artifact.constraintCompatibility.conflicts.length, 1);
  assert.equal(artifact.constraintCompatibility.conflicts[0].constraint, "no_refusal");
});

test("getKnowledgeBaseWorkflowTemplate returns valid starter payload", () => {
  const template = getKnowledgeBaseWorkflowTemplate();

  assert.ok(template.templatePayload);
  assert.equal(typeof template.templatePayload.problemContext, "string");
  assert.ok(template.templatePayload.problemContext.length > 10);
});
