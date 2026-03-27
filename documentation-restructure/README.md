# Validation-First MVP Constructor
> Timestamp (UTC): 2026-03-27T02:43:11Z
This product converts raw ideas into a validated MVP architecture by enforcing an evidence-first loop:
Input -> Validation -> Decision -> Build -> Delivery.
## What this repo is
A local-first product with:
- A configurable in-app model engine.
- A polished minimalist web UI for user-controlled model behavior.
- A backend API that enforces validation gates before feature development.
## What this repo accomplishes
- Converts user concepts into a validated problem definition.
- Scores claims with weighted, auditable evidence logic.
- Produces an MVP architecture package (workflows, data objects, API needs, feature hierarchy).
- Enforces stop/go rules for feature development and post-launch scaling.
- Supports user-defined model profiles with custom weights, thresholds, and generation modes.
## Core loop
1. Input Layer: capture concept, audience, pain points, desired outcomes.
2. Validation Layer: attach third-party reports, interviews, surveys, benchmarks.
3. Decision Layer: score trustworthiness, freshness, consistency, benefit.
4. Build Layer: generate only validated, minimum features.
5. Delivery Layer: evaluate analytics and feedback for scale/revise/remove decisions.
## API
- `GET /health`: service status.
- `GET /v1/model/profiles`: list local model profiles and active profile.
- `GET /v1/model/config`: get active profile and configuration.
- `GET /v1/kb/workflow/template`: get starter payload for the standardized Knowledge Base ladder workflow.
- `POST /v1/kb/workflow/generate`: generate a Problem -> Solution -> Value artifact with attribution, transparency, and constraint conflict reporting.
- `PUT /v1/model/profiles/:name`: create/update a profile.
- `POST /v1/model/profiles/:name/activate`: set active profile.
- `DELETE /v1/model/profiles/:name`: delete non-default profile.
- `POST /v1/evaluate`: run the full loop with the active model profile.
- `POST /v1/feedback`: submit post-launch feedback and receive iteration decision using active thresholds.
## Quick start
1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Run tests:
   - `npm test`
4. Open local UI:
   - `http://localhost:3000`
## Desktop application mode
1. Start as desktop app:
   - `npm run desktop:start`
2. Build Windows installer (creates installable app with desktop shortcut icon):
   - `npm run desktop:dist`
3. Installer artifacts output:
   - `release/`
## UI/UX capabilities
- Minimalist, typography-driven interface for focused operator workflows.
- In-UI Operator Ability Modules map that explains every major component and provides jump navigation.
- Short guided tutorial with step-by-step progression across all modules.
- Custom profile save/activate/delete controls.
- Live model tuning:
  - Evidence weights.
  - Validation and scaling thresholds.
  - Strict mode and risk register toggles.
  - Style preset and feature labeling.
- Integrated concept evaluation and feedback gating panels with structured JSON output.
- Knowledge Base workflow builder panel with:
  - one-click template loading
  - protocol payload editing
  - standardized artifact generation
  - explicit reporting of unsupported constraint requests (for example `no_refusal`)
## Legal and policy
- License: `LICENSE`
- Terms: `references/legal/TERMS_OF_SERVICE.md`
- Privacy: `references/legal/PRIVACY_POLICY.md`
- AI Disclosure: `references/legal/AI_DISCLOSURE_PROTOCOL.md`
- AI Agent Audit Policy: `docs/AI_AGENT_AUDIT_POLICY.md`
- AI Agent Update Audit Log (append-only): `docs/AI_AGENT_UPDATE_AUDIT_LOG.md`
## Distribution baseline
This repository is prepared for software distribution as a Node.js package/service baseline.
Before commercial launch, add payment, tenancy, authn/authz, secure storage, logging, and compliance controls required for your target market.
