/* ═══════════════════════════════════════════════════════════
   AXIOM HIVE — Operator Studio  |  Client Application
   ═══════════════════════════════════════════════════════════ */

// ── Element References ──────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  topbarNav:         $('#topbarNav'),
  serverDot:         $('#serverDot'),
  serverLabel:       $('#serverLabel'),
  statusBar:         $('#statusBar'),
  statusText:        $('#statusText'),
  output:            $('#output'),

  // Dashboard
  statActiveProfile: $('#statActiveProfile'),
  statThreshold:     $('#statThreshold'),
  statProfileCount:  $('#statProfileCount'),
  statStyle:         $('#statStyle'),

  // Evaluate
  concept:           $('#concept'),
  targetDemographic: $('#targetDemographic'),
  painPoints:        $('#painPoints'),
  desiredOutcomes:   $('#desiredOutcomes'),
  claimsJson:        $('#claimsJson'),
  evaluateResultCard:$('#evaluateResultCard'),
  evaluateResultSummary: $('#evaluateResultSummary'),
  evaluateOutput:    $('#evaluateOutput'),

  // Feedback
  feedbackJson:      $('#feedbackJson'),
  feedbackResultCard:$('#feedbackResultCard'),
  feedbackResultSummary: $('#feedbackResultSummary'),
  feedbackOutput:    $('#feedbackOutput'),

  // KB
  kbPayloadJson:     $('#kbPayloadJson'),
  kbResultCard:      $('#kbResultCard'),
  kbResultSummary:   $('#kbResultSummary'),
  kbOutput:          $('#kbOutput'),

  // Profiles
  profileSelect:     $('#profileSelect'),
  profileName:       $('#profileName'),
  style:             $('#style'),
  featureLabel:      $('#featureLabel'),
  maxFeatures:       $('#maxFeatures'),
  includeRiskRegister: $('#includeRiskRegister'),
  strictMode:        $('#strictMode'),

  // Weights
  weightTrustworthiness:  $('#weightTrustworthiness'),
  weightFreshness:        $('#weightFreshness'),
  weightConsistency:      $('#weightConsistency'),
  weightProjectedBenefit: $('#weightProjectedBenefit'),
  valTrust:    $('#valTrust'),
  valFresh:    $('#valFresh'),
  valCons:     $('#valCons'),
  valBenefit:  $('#valBenefit'),

  // Thresholds
  thresholdEvidence: $('#thresholdEvidence'),
  thresholdScale:    $('#thresholdScale'),
  thresholdRevise:   $('#thresholdRevise'),
  valEvidence: $('#valEvidence'),
  valScale:    $('#valScale'),
  valRevise:   $('#valRevise'),

  // Self-Validate
  validateStats:      $('#validateStats'),
  probeGrid:          $('#probeGrid'),
  validateOutput:     $('#validateOutput'),
  validateResultArea: $('#validateResultArea'),

  // Tutorial
  tutorialStepLabel:   $('#tutorialStepLabel'),
  tutorialTitle:       $('#tutorialTitle'),
  tutorialDescription: $('#tutorialDescription'),
  tutorialProgressFill:$('#tutorialProgressFill'),
};

// ── State ───────────────────────────────────────────────────
const state = {
  activeProfile: null,
  profiles: [],
  currentView: 'dashboard',
  tutorialStep: -1
};

// ── Default Data ────────────────────────────────────────────
const DEFAULT_CLAIMS = [
  {
    statement: "Operators benefit from a single triage dashboard",
    evidence: [
      { source: "industry report", trustworthiness: 0.88, freshness: 0.82, consistency: 0.85, projectedBenefit: 0.91 },
      { source: "customer interview set", trustworthiness: 0.8, freshness: 0.76, consistency: 0.84, projectedBenefit: 0.89 }
    ]
  }
];

const DEFAULT_FEEDBACK = {
  feedbackSignals: [
    { utilityScore: 0.78 },
    { utilityScore: 0.84 },
    { utilityScore: 0.69 }
  ]
};

const TUTORIAL_STEPS = [
  { title: "Ability Modules Map", desc: "The dashboard shows every major capability as a clickable module card. Use them to jump directly to any system component.", view: "dashboard" },
  { title: "Concept Evaluation", desc: "Enter your concept details, demographic targets, pain points, and claims with evidence. The engine scores each claim against weighted dimensions and gates feature development.", view: "evaluate" },
  { title: "Feedback Gate", desc: "After launch, submit utility scores from real users. The system routes to Scale, Revise, or Remove based on aggregate evidence — not assumptions.", view: "feedback" },
  { title: "Knowledge Base Builder", desc: "Generate institutional artifacts with mandatory attribution, transparency blocks, and constraint compatibility checks. Load the template to start.", view: "knowledgebase" },
  { title: "Profile Manager", desc: "Create and tune model profiles with custom weights, thresholds, strict mode, and style presets. Switch between profiles instantly.", view: "profiles" },
  { title: "Self-Validation", desc: "The system proves its own legitimacy by running functional probes and feeding the results into its own scoring engine. Evidence, not description.", view: "validate" },
  { title: "Output Console", desc: "Every operation outputs structured JSON. Copy results for review, approval, or audit-ready documentation.", view: "dashboard" }
];

// ── API ─────────────────────────────────────────────────────
async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Request failed');
  return body;
}

// ── Navigation ──────────────────────────────────────────────
function navigateTo(viewName) {
  state.currentView = viewName;

  // Hide all views
  $$('.view').forEach(v => v.classList.remove('is-visible'));

  // Show target view
  const target = $(`#${viewName}View`);
  if (target) target.classList.add('is-visible');

  // Update nav links
  $$('.topbar-link').forEach(link => {
    link.classList.toggle('is-active', link.dataset.view === viewName);
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach navigation to all elements with data-view
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-view]');
  if (!trigger) return;
  e.preventDefault();
  navigateTo(trigger.dataset.view);
});

// ── Status ──────────────────────────────────────────────────
function setStatus(msg, type = 'info') {
  el.statusBar.className = `status-bar ${type}`;
  el.statusText.textContent = msg;
}

// ── Comma-separated parser ──────────────────────────────────
function parseList(val) {
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

// ── Range slider live values ────────────────────────────────
function setupRangeSync(inputEl, displayEl) {
  const update = () => { displayEl.textContent = Number(inputEl.value).toFixed(2); };
  inputEl.addEventListener('input', update);
  update();
}

setupRangeSync(el.weightTrustworthiness, el.valTrust);
setupRangeSync(el.weightFreshness, el.valFresh);
setupRangeSync(el.weightConsistency, el.valCons);
setupRangeSync(el.weightProjectedBenefit, el.valBenefit);
setupRangeSync(el.thresholdEvidence, el.valEvidence);
setupRangeSync(el.thresholdScale, el.valScale);
setupRangeSync(el.thresholdRevise, el.valRevise);

// ── Read/Write Model Config ─────────────────────────────────
function readModelConfig() {
  return {
    weights: {
      trustworthiness:  Number(el.weightTrustworthiness.value),
      freshness:        Number(el.weightFreshness.value),
      consistency:      Number(el.weightConsistency.value),
      projectedBenefit: Number(el.weightProjectedBenefit.value)
    },
    thresholds: {
      evidenceScore: Number(el.thresholdEvidence.value),
      scale:         Number(el.thresholdScale.value),
      revise:        Number(el.thresholdRevise.value)
    },
    generation: {
      style:              el.style.value,
      maxFeatures:        Number(el.maxFeatures.value),
      includeRiskRegister: el.includeRiskRegister.checked,
      strictMode:         el.strictMode.checked,
      featureLabel:       el.featureLabel.value.trim() || 'Feature'
    }
  };
}

function hydrateConfig(cfg) {
  el.style.value = cfg.generation.style;
  el.featureLabel.value = cfg.generation.featureLabel;
  el.maxFeatures.value = String(cfg.generation.maxFeatures);
  el.includeRiskRegister.checked = Boolean(cfg.generation.includeRiskRegister);
  el.strictMode.checked = Boolean(cfg.generation.strictMode);

  el.weightTrustworthiness.value = String(cfg.weights.trustworthiness);
  el.weightFreshness.value = String(cfg.weights.freshness);
  el.weightConsistency.value = String(cfg.weights.consistency);
  el.weightProjectedBenefit.value = String(cfg.weights.projectedBenefit);

  el.thresholdEvidence.value = String(cfg.thresholds.evidenceScore);
  el.thresholdScale.value = String(cfg.thresholds.scale);
  el.thresholdRevise.value = String(cfg.thresholds.revise);

  // Sync display values
  el.valTrust.textContent = Number(cfg.weights.trustworthiness).toFixed(2);
  el.valFresh.textContent = Number(cfg.weights.freshness).toFixed(2);
  el.valCons.textContent = Number(cfg.weights.consistency).toFixed(2);
  el.valBenefit.textContent = Number(cfg.weights.projectedBenefit).toFixed(2);
  el.valEvidence.textContent = Number(cfg.thresholds.evidenceScore).toFixed(2);
  el.valScale.textContent = Number(cfg.thresholds.scale).toFixed(2);
  el.valRevise.textContent = Number(cfg.thresholds.revise).toFixed(2);
}

// ── Profiles ────────────────────────────────────────────────
function renderProfiles() {
  el.profileSelect.innerHTML = '';
  for (const p of state.profiles) {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.isActive ? `${p.name} (active)` : p.name;
    el.profileSelect.append(opt);
  }
  if (state.activeProfile) el.profileSelect.value = state.activeProfile;
}

async function refreshProfiles() {
  const data = await api('/v1/model/profiles');
  state.activeProfile = data.activeProfile;
  state.profiles = data.profiles;
  renderProfiles();

  const active = state.profiles.find(p => p.name === state.activeProfile);
  if (active) {
    hydrateConfig(active.config);
    el.profileName.value = active.name;
  }

  // Update dashboard stats
  el.statActiveProfile.textContent = state.activeProfile ?? '—';
  el.statProfileCount.textContent = String(state.profiles.length);
  if (active) {
    el.statThreshold.textContent = Number(active.config.thresholds.evidenceScore).toFixed(2);
    el.statStyle.textContent = active.config.generation.style;
  }
}

el.profileSelect.addEventListener('change', () => {
  const sel = state.profiles.find(p => p.name === el.profileSelect.value);
  if (sel) {
    hydrateConfig(sel.config);
    el.profileName.value = sel.name;
  }
});

$('#saveProfileButton').addEventListener('click', async () => {
  try {
    const name = el.profileName.value.trim();
    if (!name) throw new Error('Enter a profile name before saving');
    await api(`/v1/model/profiles/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(readModelConfig())
    });
    await refreshProfiles();
    el.profileSelect.value = name;
    setStatus(`Profile "${name}" saved successfully`, 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

$('#activateProfileButton').addEventListener('click', async () => {
  try {
    const name = el.profileSelect.value;
    if (!name) throw new Error('Select a profile first');
    await api(`/v1/model/profiles/${encodeURIComponent(name)}/activate`, { method: 'POST' });
    await refreshProfiles();
    setStatus(`Profile "${name}" activated`, 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

$('#deleteProfileButton').addEventListener('click', async () => {
  try {
    const name = el.profileSelect.value;
    if (!name) throw new Error('Select a profile first');
    await api(`/v1/model/profiles/${encodeURIComponent(name)}`, { method: 'DELETE' });
    await refreshProfiles();
    setStatus(`Profile "${name}" deleted`, 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

// ── Evaluate ────────────────────────────────────────────────
$('#evaluateButton').addEventListener('click', async () => {
  try {
    setStatus('Running evaluation…', 'info');
    const claims = JSON.parse(el.claimsJson.value);
    const payload = {
      concept: el.concept.value.trim(),
      targetDemographic: el.targetDemographic.value.trim(),
      painPoints: parseList(el.painPoints.value),
      desiredOutcomes: parseList(el.desiredOutcomes.value),
      claims
    };
    const result = await api('/v1/evaluate', { method: 'POST', body: JSON.stringify(payload) });

    // Show inline result
    el.evaluateResultCard.style.display = 'block';
    el.evaluateOutput.textContent = JSON.stringify(result, null, 2);

    // Summary
    const ds = result.decisionSummary;
    const gateClass = result.loopGateDecision.includes('BUILD') ? 'build' : result.loopGateDecision.includes('STRICT') ? 'stop' : 'stop';
    el.evaluateResultSummary.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card"><div class="stat-label">Total Claims</div><div class="stat-value">${ds.totalClaims}</div></div>
        <div class="stat-card"><div class="stat-label">Validated</div><div class="stat-value" style="color:var(--green)">${ds.validatedClaims}</div></div>
        <div class="stat-card"><div class="stat-label">Insufficient</div><div class="stat-value" style="color:${ds.insufficientClaims > 0 ? 'var(--red)' : 'var(--ink-primary)'}">${ds.insufficientClaims}</div></div>
      </div>
      <div class="gate-decision ${gateClass}">${result.loopGateDecision.replace(/_/g, ' ')}</div>
    `;

    // Also write to main output console
    el.output.textContent = JSON.stringify(result, null, 2);
    setStatus(`Evaluation complete — ${result.loopGateDecision}`, ds.shouldStopFeatureDevelopment ? 'warning' : 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

// ── Feedback ────────────────────────────────────────────────
$('#feedbackButton').addEventListener('click', async () => {
  try {
    setStatus('Processing feedback…', 'info');
    const payload = JSON.parse(el.feedbackJson.value);
    const result = await api('/v1/feedback', { method: 'POST', body: JSON.stringify(payload) });

    el.feedbackResultCard.style.display = 'block';
    el.feedbackOutput.textContent = JSON.stringify(result, null, 2);

    const actionClass = result.action === 'SCALE' ? 'build' : result.action === 'REVISE' ? 'revise' : 'stop';
    el.feedbackResultSummary.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card"><div class="stat-label">Average Utility</div><div class="stat-value">${result.averageUtility}</div></div>
        <div class="stat-card"><div class="stat-label">Action</div><div class="stat-value" style="font-size:20px">${result.action}</div></div>
        <div class="stat-card"><div class="stat-label">Rationale</div><div class="stat-value" style="font-size:14px;color:var(--ink-secondary)">${result.rationale}</div></div>
      </div>
      <div class="gate-decision ${actionClass}">${result.action}</div>
    `;

    el.output.textContent = JSON.stringify(result, null, 2);
    setStatus(`Feedback decision: ${result.action}`, result.action === 'SCALE' ? 'success' : 'warning');
  } catch (e) { setStatus(e.message, 'error'); }
});

// ── Knowledge Base ──────────────────────────────────────────
$('#kbTemplateButton').addEventListener('click', async () => {
  try {
    const data = await api('/v1/kb/workflow/template');
    el.kbPayloadJson.value = JSON.stringify(data.templatePayload, null, 2);
    setStatus('KB workflow template loaded', 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

$('#kbGenerateButton').addEventListener('click', async () => {
  try {
    setStatus('Generating KB artifact…', 'info');
    const payload = JSON.parse(el.kbPayloadJson.value);
    const result = await api('/v1/kb/workflow/generate', { method: 'POST', body: JSON.stringify(payload) });

    el.kbResultCard.style.display = 'block';
    el.kbOutput.textContent = JSON.stringify(result, null, 2);

    const conflicts = result.constraintCompatibility?.conflicts?.length ?? 0;
    el.kbResultSummary.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card"><div class="stat-label">Confidence</div><div class="stat-value">${result.transparency?.confidence ?? '—'}</div></div>
        <div class="stat-card"><div class="stat-label">Workflow Steps</div><div class="stat-value">${result.workflowArtifact?.length ?? '—'}</div></div>
        <div class="stat-card"><div class="stat-label">Conflicts</div><div class="stat-value" style="color:${conflicts > 0 ? 'var(--amber)' : 'var(--green)'}">${conflicts}</div></div>
      </div>
    `;

    el.output.textContent = JSON.stringify(result, null, 2);
    setStatus(`KB artifact generated — confidence: ${result.transparency?.confidence}`, conflicts > 0 ? 'warning' : 'success');
  } catch (e) { setStatus(e.message, 'error'); }
});

// ── Self-Validate ───────────────────────────────────────────
$('#selfValidateButton').addEventListener('click', async () => {
  try {
    setStatus('Running system integrity check…', 'info');
    const report = await api('/v1/self-validate');

    el.validateResultArea.style.display = 'block';

    // Summary stats
    const meta = report.meta;
    const ds = report.evaluation.decisionSummary;
    const gateClass = report.evaluation.loopGateDecision.includes('BUILD') ? 'build' : 'stop';
    el.validateStats.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Probe Pass Rate</div>
        <div class="stat-value" style="color:${meta.probePassRate >= 1 ? 'var(--green)' : 'var(--red)'}">${(meta.probePassRate * 100).toFixed(0)}%</div>
        <div class="stat-badge ${meta.probePassRate >= 1 ? 'green' : 'red'}">${meta.probeCount} probes executed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Claims Validated</div>
        <div class="stat-value" style="color:var(--green)">${ds.validatedClaims} / ${ds.totalClaims}</div>
        <div class="stat-badge green">zero insufficient</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Gate Decision</div>
        <div class="stat-value" style="font-size:16px">${report.evaluation.loopGateDecision.replace(/_/g, ' ')}</div>
        <div class="gate-decision ${gateClass}" style="margin-top:8px;font-size:11px;padding:6px 12px">${gateClass === 'build' ? '✓ LEGITIMATE' : '✗ FAILED'}</div>
      </div>
    `;

    // Probe cards
    el.probeGrid.innerHTML = report.probeDetails.map(probe => {
      const score = probe.scores.trustworthiness;
      const pass = score >= 0.9;
      const name = probe.id.replace('functional:', '').replace(/-/g, ' ');
      return `
        <div class="probe-card">
          <div class="probe-name">${name}</div>
          <div class="probe-score ${pass ? 'pass' : 'fail'}">${(score * 100).toFixed(0)}%</div>
          <div class="probe-detail">${probe.source.replace('live system execution — ', '')}</div>
        </div>
      `;
    }).join('');

    el.validateOutput.textContent = JSON.stringify(report, null, 2);
    el.output.textContent = JSON.stringify(report, null, 2);
    setStatus(`Self-validation complete — ${report.evaluation.loopGateDecision}`, meta.probePassRate >= 1 ? 'success' : 'error');
  } catch (e) { setStatus(e.message, 'error'); }
});

// ── Tutorial ────────────────────────────────────────────────
function renderTutorial() {
  const step = TUTORIAL_STEPS[state.tutorialStep];
  if (!step) return;

  el.tutorialStepLabel.textContent = `Step ${state.tutorialStep + 1} of ${TUTORIAL_STEPS.length}`;
  el.tutorialTitle.textContent = step.title;
  el.tutorialDescription.textContent = step.desc;
  el.tutorialProgressFill.style.width = `${((state.tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%`;

  $('#tutorialPrevButton').disabled = state.tutorialStep <= 0;
  $('#tutorialNextButton').disabled = state.tutorialStep >= TUTORIAL_STEPS.length - 1;
}

$('#tutorialStartButton').addEventListener('click', () => {
  state.tutorialStep = 0;
  renderTutorial();
  setStatus('Tutorial started — follow each step', 'info');
});

$('#tutorialPrevButton').addEventListener('click', () => {
  if (state.tutorialStep <= 0) return;
  state.tutorialStep--;
  renderTutorial();
});

$('#tutorialNextButton').addEventListener('click', () => {
  if (state.tutorialStep >= TUTORIAL_STEPS.length - 1) return;
  state.tutorialStep++;
  renderTutorial();
});

// ── Copy Buttons ────────────────────────────────────────────
$('#copyOutputButton').addEventListener('click', () => {
  navigator.clipboard.writeText(el.output.textContent).then(() => {
    setStatus('Copied to clipboard', 'success');
  });
});

$('#copyValidateButton').addEventListener('click', () => {
  navigator.clipboard.writeText(el.validateOutput.textContent).then(() => {
    setStatus('Copied to clipboard', 'success');
  });
});

// ── Bootstrap ───────────────────────────────────────────────
async function bootstrap() {
  // Seed form defaults
  el.concept.value = 'Validation-first app builder for solo software operators';
  el.targetDemographic.value = 'solo founders and product engineers';
  el.painPoints.value = 'feature bloat, weak validation evidence, delayed iteration cycles';
  el.desiredOutcomes.value = 'ship proven MVPs, improve adoption, reduce wasted engineering';
  el.claimsJson.value = JSON.stringify(DEFAULT_CLAIMS, null, 2);
  el.feedbackJson.value = JSON.stringify(DEFAULT_FEEDBACK, null, 2);

  try {
    // Check server health
    await api('/health');
    el.serverDot.style.background = 'var(--green)';
    el.serverLabel.textContent = 'Online';

    // Load profiles and KB template
    await refreshProfiles();
    const tpl = await api('/v1/kb/workflow/template');
    el.kbPayloadJson.value = JSON.stringify(tpl.templatePayload, null, 2);

    setStatus('Operator Studio ready — select a module to begin', 'success');
  } catch (e) {
    el.serverDot.style.background = 'var(--red)';
    el.serverLabel.textContent = 'Offline';
    setStatus(`Connection error: ${e.message}`, 'error');
  }
}

bootstrap();
