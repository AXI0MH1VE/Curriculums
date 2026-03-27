const profileSelect = document.querySelector("#profileSelect");
const profileNameInput = document.querySelector("#profileName");
const styleSelect = document.querySelector("#style");
const featureLabelInput = document.querySelector("#featureLabel");
const maxFeaturesInput = document.querySelector("#maxFeatures");
const weightTrustworthinessInput = document.querySelector("#weightTrustworthiness");
const weightFreshnessInput = document.querySelector("#weightFreshness");
const weightConsistencyInput = document.querySelector("#weightConsistency");
const weightProjectedBenefitInput = document.querySelector("#weightProjectedBenefit");
const thresholdEvidenceInput = document.querySelector("#thresholdEvidence");
const thresholdScaleInput = document.querySelector("#thresholdScale");
const thresholdReviseInput = document.querySelector("#thresholdRevise");
const includeRiskRegisterInput = document.querySelector("#includeRiskRegister");
const strictModeInput = document.querySelector("#strictMode");
const conceptInput = document.querySelector("#concept");
const targetDemographicInput = document.querySelector("#targetDemographic");
const painPointsInput = document.querySelector("#painPoints");
const desiredOutcomesInput = document.querySelector("#desiredOutcomes");
const claimsJsonInput = document.querySelector("#claimsJson");
const feedbackJsonInput = document.querySelector("#feedbackJson");
const kbPayloadJsonInput = document.querySelector("#kbPayloadJson");
const outputElement = document.querySelector("#output");
const statusElement = document.querySelector("#status");
const tutorialTitleElement = document.querySelector("#tutorialTitle");
const tutorialDescriptionElement = document.querySelector("#tutorialDescription");
const tutorialProgressElement = document.querySelector("#tutorialProgress");
const saveProfileButton = document.querySelector("#saveProfileButton");
const activateProfileButton = document.querySelector("#activateProfileButton");
const deleteProfileButton = document.querySelector("#deleteProfileButton");
const evaluateButton = document.querySelector("#evaluateButton");
const feedbackButton = document.querySelector("#feedbackButton");
const kbTemplateButton = document.querySelector("#kbTemplateButton");
const kbGenerateButton = document.querySelector("#kbGenerateButton");
const tutorialStartButton = document.querySelector("#tutorialStartButton");
const tutorialPrevButton = document.querySelector("#tutorialPrevButton");
const tutorialNextButton = document.querySelector("#tutorialNextButton");
const jumpButtons = document.querySelectorAll(".nav-jump, .module-jump");

const state = {
  activeProfile: null,
  profiles: [],
  tutorialStepIndex: 0
};

const DEFAULT_CLAIMS_JSON = JSON.stringify(
  [
    {
      statement: "Operators benefit from a single triage dashboard",
      evidence: [
        {
          source: "industry report",
          trustworthiness: 0.88,
          freshness: 0.82,
          consistency: 0.85,
          projectedBenefit: 0.91
        },
        {
          source: "customer interview set",
          trustworthiness: 0.8,
          freshness: 0.76,
          consistency: 0.84,
          projectedBenefit: 0.89
        }
      ]
    }
  ],
  null,
  2
);

const DEFAULT_FEEDBACK_JSON = JSON.stringify(
  {
    feedbackSignals: [{ utilityScore: 0.78 }, { utilityScore: 0.84 }, { utilityScore: 0.69 }]
  },
  null,
  2
);
const tutorialSteps = [
  {
    title: "Step 1 — Ability Modules Map",
    description:
      "Review the Operator Ability Modules section to see every major capability and jump directly to each component.",
    targetId: "abilityMapSection"
  },
  {
    title: "Step 2 — Profile Manager",
    description:
      "Create or select a model profile so your settings are reusable and aligned with operator workflow preferences.",
    targetId: "modelProfilesSection"
  },
  {
    title: "Step 3 — Model Controls",
    description:
      "Tune evidence weights, thresholds, strict mode, and style settings to define how the local model makes decisions.",
    targetId: "modelControlsSection"
  },
  {
    title: "Step 4 — Concept Evaluation",
    description:
      "Provide concept context and claims JSON, then run evaluation to generate validated architecture and gate decisions.",
    targetId: "conceptEvaluationSection"
  },
  {
    title: "Step 5 — Feedback Gate",
    description:
      "Submit utility signals to determine whether to scale, revise, or remove based on post-launch evidence.",
    targetId: "feedbackGateSection"
  },
  {
    title: "Step 6 — Knowledge Base Workflow",
    description:
      "Use template payloads and generate formal Problem -> Solution -> Value artifacts with transparency and constraint checks.",
    targetId: "kbWorkflowSection"
  },
  {
    title: "Step 7 — Output Console",
    description:
      "Inspect structured JSON results for approval, reuse, and audit-ready decision communication.",
    targetId: "outputSection"
  }
];

function getPanelById(panelId) {
  return document.getElementById(panelId);
}

function clearFocusedPanels() {
  document.querySelectorAll(".panel.is-focused").forEach((panel) => panel.classList.remove("is-focused"));
}

function focusPanel(panelId) {
  const panel = getPanelById(panelId);
  if (!panel) {
    return;
  }

  clearFocusedPanels();
  panel.classList.add("is-focused");
  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderTutorialStep(shouldFocus = true) {
  const step = tutorialSteps[state.tutorialStepIndex];
  if (!step) {
    return;
  }

  tutorialTitleElement.textContent = step.title;
  tutorialDescriptionElement.textContent = step.description;
  tutorialProgressElement.textContent = `Step ${state.tutorialStepIndex + 1} of ${tutorialSteps.length}`;

  tutorialPrevButton.disabled = state.tutorialStepIndex === 0;
  tutorialNextButton.disabled = state.tutorialStepIndex === tutorialSteps.length - 1;
  if (shouldFocus) {
    focusPanel(step.targetId);
  }
}

function setStatus(message, type = "info") {
  statusElement.textContent = message;
  statusElement.style.color = type === "error" ? "#a42d2d" : "#4a505b";
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "request failed");
  }
  return payload;
}

async function loadKnowledgeBaseTemplate() {
  const payload = await requestJson("/v1/kb/workflow/template");
  kbPayloadJsonInput.value = JSON.stringify(payload.templatePayload, null, 2);
}

function parseList(inputValue) {
  return inputValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readModelConfigFromForm() {
  return {
    weights: {
      trustworthiness: Number(weightTrustworthinessInput.value),
      freshness: Number(weightFreshnessInput.value),
      consistency: Number(weightConsistencyInput.value),
      projectedBenefit: Number(weightProjectedBenefitInput.value)
    },
    thresholds: {
      evidenceScore: Number(thresholdEvidenceInput.value),
      scale: Number(thresholdScaleInput.value),
      revise: Number(thresholdReviseInput.value)
    },
    generation: {
      style: styleSelect.value,
      maxFeatures: Number(maxFeaturesInput.value),
      includeRiskRegister: includeRiskRegisterInput.checked,
      strictMode: strictModeInput.checked,
      featureLabel: featureLabelInput.value.trim() || "Feature"
    }
  };
}

function hydrateFormFromConfig(config) {
  styleSelect.value = config.generation.style;
  featureLabelInput.value = config.generation.featureLabel;
  maxFeaturesInput.value = String(config.generation.maxFeatures);
  includeRiskRegisterInput.checked = Boolean(config.generation.includeRiskRegister);
  strictModeInput.checked = Boolean(config.generation.strictMode);

  weightTrustworthinessInput.value = String(config.weights.trustworthiness);
  weightFreshnessInput.value = String(config.weights.freshness);
  weightConsistencyInput.value = String(config.weights.consistency);
  weightProjectedBenefitInput.value = String(config.weights.projectedBenefit);

  thresholdEvidenceInput.value = String(config.thresholds.evidenceScore);
  thresholdScaleInput.value = String(config.thresholds.scale);
  thresholdReviseInput.value = String(config.thresholds.revise);
}

function renderProfiles() {
  profileSelect.innerHTML = "";
  for (const profile of state.profiles) {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = profile.isActive ? `${profile.name} (active)` : profile.name;
    profileSelect.append(option);
  }
  if (state.activeProfile) {
    profileSelect.value = state.activeProfile;
  }
}

async function refreshProfiles() {
  const payload = await requestJson("/v1/model/profiles");
  state.activeProfile = payload.activeProfile;
  state.profiles = payload.profiles;
  renderProfiles();

  const activeProfile = state.profiles.find((profile) => profile.name === state.activeProfile);
  if (activeProfile) {
    hydrateFormFromConfig(activeProfile.config);
    profileNameInput.value = activeProfile.name;
  }
}

function getSelectedProfile() {
  return state.profiles.find((profile) => profile.name === profileSelect.value) ?? null;
}

for (const jumpButton of jumpButtons) {
  jumpButton.addEventListener("click", () => {
    const targetId = jumpButton.dataset.target;
    if (!targetId) {
      return;
    }
    focusPanel(targetId);
  });
}

profileSelect.addEventListener("change", () => {
  const selected = getSelectedProfile();
  if (!selected) {
    return;
  }
  hydrateFormFromConfig(selected.config);
  profileNameInput.value = selected.name;
});

saveProfileButton.addEventListener("click", async () => {
  try {
    const profileName = profileNameInput.value.trim();
    if (!profileName) {
      throw new Error("enter a profile name before saving");
    }
    const config = readModelConfigFromForm();
    await requestJson(`/v1/model/profiles/${encodeURIComponent(profileName)}`, {
      method: "PUT",
      body: JSON.stringify(config)
    });
    await refreshProfiles();
    profileSelect.value = profileName;
    setStatus(`profile ${profileName} saved`);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

activateProfileButton.addEventListener("click", async () => {
  try {
    const profileName = profileSelect.value;
    if (!profileName) {
      throw new Error("select a profile to activate");
    }
    await requestJson(`/v1/model/profiles/${encodeURIComponent(profileName)}/activate`, {
      method: "POST"
    });
    await refreshProfiles();
    setStatus(`profile ${profileName} activated`);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

deleteProfileButton.addEventListener("click", async () => {
  try {
    const profileName = profileSelect.value;
    if (!profileName) {
      throw new Error("select a profile to delete");
    }
    await requestJson(`/v1/model/profiles/${encodeURIComponent(profileName)}`, {
      method: "DELETE"
    });
    await refreshProfiles();
    setStatus(`profile ${profileName} deleted`);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

evaluateButton.addEventListener("click", async () => {
  try {
    const claims = JSON.parse(claimsJsonInput.value);
    const payload = {
      concept: conceptInput.value.trim(),
      targetDemographic: targetDemographicInput.value.trim(),
      painPoints: parseList(painPointsInput.value),
      desiredOutcomes: parseList(desiredOutcomesInput.value),
      claims
    };
    const result = await requestJson("/v1/evaluate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    outputElement.textContent = JSON.stringify(result, null, 2);
    setStatus(`evaluation complete with profile ${result.activeModelProfile}`);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

feedbackButton.addEventListener("click", async () => {
  try {
    const payload = JSON.parse(feedbackJsonInput.value);
    const result = await requestJson("/v1/feedback", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    outputElement.textContent = JSON.stringify(result, null, 2);
    setStatus("feedback gate decision complete");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

kbTemplateButton.addEventListener("click", async () => {
  try {
    await loadKnowledgeBaseTemplate();
    setStatus("knowledge base workflow template loaded");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

kbGenerateButton.addEventListener("click", async () => {
  try {
    const payload = JSON.parse(kbPayloadJsonInput.value);
    const result = await requestJson("/v1/kb/workflow/generate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    outputElement.textContent = JSON.stringify(result, null, 2);
    setStatus("knowledge base workflow artifact generated");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

tutorialStartButton.addEventListener("click", () => {
  state.tutorialStepIndex = 0;
  renderTutorialStep();
  setStatus("tutorial started");
});

tutorialPrevButton.addEventListener("click", () => {
  if (state.tutorialStepIndex <= 0) {
    return;
  }
  state.tutorialStepIndex -= 1;
  renderTutorialStep();
  setStatus("tutorial moved to previous step");
});

tutorialNextButton.addEventListener("click", () => {
  if (state.tutorialStepIndex >= tutorialSteps.length - 1) {
    return;
  }
  state.tutorialStepIndex += 1;
  renderTutorialStep();
  setStatus("tutorial moved to next step");
});

async function bootstrap() {
  claimsJsonInput.value = DEFAULT_CLAIMS_JSON;
  feedbackJsonInput.value = DEFAULT_FEEDBACK_JSON;
  conceptInput.value = "Validation-first app builder for solo software operators";
  targetDemographicInput.value = "solo founders and product engineers";
  painPointsInput.value = "feature bloat, weak validation evidence, delayed iteration cycles";
  desiredOutcomesInput.value = "ship proven MVPs, improve adoption, reduce wasted engineering";

  try {
    await refreshProfiles();
    await loadKnowledgeBaseTemplate();
    renderTutorialStep(false);
    setStatus("local model studio ready");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

bootstrap();
