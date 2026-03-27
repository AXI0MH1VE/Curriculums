import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateConcept, evaluatePostLaunchFeedback } from "./engine.js";
import { generateKnowledgeBaseWorkflow, getKnowledgeBaseWorkflowTemplate } from "./kbProtocol.js";
import { runSelfValidation } from "./selfValidation.js";
import {
  activateModelProfile,
  deleteModelProfile,
  getActiveModelProfile,
  listModelProfiles,
  upsertModelProfile
} from "./modelProfiles.js";
import { saveEvaluation, getEvaluation } from "./dataStore.js";

// ── Domain Modules ──────────────────────────────────────────
import {
  createConcept,
  updateConcept,
  getConcept,
  listConcepts,
  addClaim,
  updateClaim,
  getClaimsForConcept,
  startValidationRun,
  getLoopState
} from "./modules/intake.js";
import {
  registerEvidenceSource,
  listEvidenceSources,
  addEvidence,
  getEvidenceForClaim
} from "./modules/claimVerifier.js";
import {
  scoreEvidence,
  recalculateClaimConfidence,
  assessConceptReadiness
} from "./modules/evidenceScorer.js";
import {
  generateFeatureCandidates,
  rankFeaturesByUtility,
  selectMVPFeatures,
  getFeaturesForConcept,
  createMVPArchitecture
} from "./modules/mvpGenerator.js";
import {
  recomputeFeatureUtility,
  pruneLowUtilityFeatures,
  markCoreMVPFeatures
} from "./modules/utilityPrioritizer.js";
import {
  recordUserFeedback,
  recordUsageEvent,
  computeFeatureHealth,
  runIterationGate,
  getFeedbackForConcept
} from "./modules/deliveryLayer.js";
import { exportAuditTrail, exportAuditTrailMarkdown } from "./modules/audit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIRECTORY = path.join(__dirname, "..", "public");

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(PUBLIC_DIRECTORY));

  // ═══════════════════════════════════════════════════════════
  // Health
  // ═══════════════════════════════════════════════════════════
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ═══════════════════════════════════════════════════════════
  // Model Profile Management
  // ═══════════════════════════════════════════════════════════
  app.get("/v1/model/profiles", (_req, res) => {
    const active = getActiveModelProfile();
    res.status(200).json({
      activeProfile: active.name,
      profiles: listModelProfiles()
    });
  });

  app.get("/v1/model/config", (_req, res) => {
    res.status(200).json(getActiveModelProfile());
  });

  app.put("/v1/model/profiles/:name", (req, res) => {
    try {
      const profile = upsertModelProfile(req.params.name, req.body);
      res.status(200).json(profile);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/v1/model/profiles/:name/activate", (req, res) => {
    try {
      const active = activateModelProfile(req.params.name);
      res.status(200).json(active);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/v1/model/profiles/:name", (req, res) => {
    try {
      deleteModelProfile(req.params.name);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Knowledge Base Protocol
  // ═══════════════════════════════════════════════════════════
  app.get("/v1/kb/workflow/template", (_req, res) => {
    res.status(200).json(getKnowledgeBaseWorkflowTemplate());
  });

  app.post("/v1/kb/workflow/generate", (req, res) => {
    try {
      const artifact = generateKnowledgeBaseWorkflow(req.body);
      res.status(200).json(artifact);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Legacy Evaluate (flat payload — original engine)
  // ═══════════════════════════════════════════════════════════
  app.post("/v1/evaluate", (req, res) => {
    try {
      const activeProfile = getActiveModelProfile();
      const evaluation = evaluateConcept(req.body, {
        modelConfig: activeProfile.config,
        profileName: activeProfile.name
      });
      const id = crypto.randomUUID();
      saveEvaluation(id, evaluation);

      res.status(200).json({
        evaluationId: id,
        ...evaluation
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  app.get("/v1/claims/:id", (req, res) => {
    const record = getEvaluation(req.params.id);
    if (!record) {
      res.status(404).json({
        error: "Evaluation not found"
      });
      return;
    }

    res.status(200).json(record);
  });

  app.post("/v1/feedback", (req, res) => {
    try {
      const activeProfile = getActiveModelProfile();
      const feedbackDecision = evaluatePostLaunchFeedback(req.body, {
        modelConfig: activeProfile.config
      });
      res.status(200).json(feedbackDecision);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Self-Validation
  // ═══════════════════════════════════════════════════════════
  app.get("/v1/self-validate", (_req, res) => {
    try {
      const report = runSelfValidation();
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ┌─────────────────────────────────────────────────────────┐
  // │ DOMAIN LIFECYCLE ROUTES (Full XPII Loop)               │
  // └─────────────────────────────────────────────────────────┘
  // ═══════════════════════════════════════════════════════════

  // ── Concept Management ────────────────────────────────────
  app.post("/v1/concepts", (req, res) => {
    try {
      const concept = createConcept(req.body);
      res.status(201).json(concept);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/concepts", (_req, res) => {
    res.status(200).json(listConcepts());
  });

  app.get("/v1/concepts/:id", (req, res) => {
    const concept = getConcept(req.params.id);
    if (!concept) return res.status(404).json({ error: "Concept not found" });
    res.status(200).json(concept);
  });

  app.patch("/v1/concepts/:id", (req, res) => {
    try {
      const concept = updateConcept(req.params.id, req.body);
      res.status(200).json(concept);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Claims ────────────────────────────────────────────────
  app.post("/v1/concepts/:id/claims", (req, res) => {
    try {
      const claim = addClaim(req.params.id, req.body);
      res.status(201).json(claim);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/concepts/:id/claims", (req, res) => {
    res.status(200).json(getClaimsForConcept(req.params.id));
  });

  app.patch("/v1/domain/claims/:id", (req, res) => {
    try {
      const claim = updateClaim(req.params.id, req.body);
      res.status(200).json(claim);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Evidence Sources ──────────────────────────────────────
  app.post("/v1/evidence-sources", (req, res) => {
    try {
      const source = registerEvidenceSource(req.body);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/evidence-sources", (_req, res) => {
    res.status(200).json(listEvidenceSources());
  });

  // ── Evidence on Claims ────────────────────────────────────
  app.post("/v1/domain/claims/:id/evidence", (req, res) => {
    try {
      const evidence = addEvidence(req.params.id, req.body);
      res.status(201).json(evidence);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/domain/claims/:id/evidence", (req, res) => {
    res.status(200).json(getEvidenceForClaim(req.params.id));
  });

  // ── Validation & Scoring ──────────────────────────────────
  app.post("/v1/concepts/:id/validate", (req, res) => {
    try {
      const run = startValidationRun(req.params.id);
      res.status(200).json(run);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/v1/domain/claims/:id/score", (req, res) => {
    try {
      const claim = recalculateClaimConfidence(req.params.id);
      res.status(200).json(claim);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/concepts/:id/readiness", (req, res) => {
    try {
      const result = assessConceptReadiness(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── MVP Generation ────────────────────────────────────────
  app.post("/v1/concepts/:id/generate-mvp", (req, res) => {
    try {
      const result = createMVPArchitecture(req.params.id);
      if (result.error) {
        return res.status(422).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/concepts/:id/features", (req, res) => {
    res.status(200).json(getFeaturesForConcept(req.params.id));
  });

  app.post("/v1/concepts/:id/features/rank", (req, res) => {
    try {
      const ranked = rankFeaturesByUtility(req.params.id);
      res.status(200).json(ranked);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/v1/concepts/:id/features/prune", (req, res) => {
    try {
      const result = pruneLowUtilityFeatures(req.params.id, req.body.threshold);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Post-Launch Feedback & Iteration Gate ─────────────────
  app.post("/v1/concepts/:id/user-feedback", (req, res) => {
    try {
      const fb = recordUserFeedback({ ...req.body, concept_id: req.params.id });
      res.status(201).json(fb);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/v1/concepts/:id/user-feedback", (req, res) => {
    res.status(200).json(getFeedbackForConcept(req.params.id));
  });

  app.post("/v1/concepts/:id/usage-event", (req, res) => {
    try {
      const event = recordUsageEvent({ ...req.body, concept_id: req.params.id });
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/v1/concepts/:id/iterate", (req, res) => {
    try {
      const result = runIterationGate(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Loop State ────────────────────────────────────────────
  app.get("/v1/concepts/:id/loop-state", (req, res) => {
    const state = getLoopState(req.params.id);
    if (!state) return res.status(404).json({ error: "Loop state not found" });
    res.status(200).json(state);
  });

  // ── Audit Trail ───────────────────────────────────────────
  app.get("/v1/audit", (_req, res) => {
    res.status(200).json(exportAuditTrail());
  });

  app.get("/v1/audit/:conceptId", (req, res) => {
    res.status(200).json(exportAuditTrail(req.params.conceptId));
  });

  app.get("/v1/audit/:conceptId/markdown", (req, res) => {
    res.set("Content-Type", "text/markdown");
    res.status(200).send(exportAuditTrailMarkdown(req.params.conceptId));
  });

  return app;
}
