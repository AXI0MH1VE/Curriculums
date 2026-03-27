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
import { getEvaluation, saveEvaluation } from "./store.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIRECTORY = path.join(__dirname, "..", "public");

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(PUBLIC_DIRECTORY));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
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

  app.get("/v1/self-validate", (_req, res) => {
    try {
      const report = runSelfValidation();
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
