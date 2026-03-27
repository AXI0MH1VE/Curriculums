# System Architecture
> Timestamp (UTC): 2026-03-27T02:43:11Z
## Problem statement
Teams overbuild features from unvalidated assumptions. The result is waste, low adoption, and rework.
## Solution statement
Enforce a validation-first decision system that blocks feature engineering unless empirical evidence is strong.
## Modules
### Problem Intake
Accepts concept metadata and testable claims.
### Claim Verifier
Normalizes and checks evidence records for claim support quality.
### Evidence Scorer
Calculates weighted confidence values from trustworthiness, freshness, consistency, and projected user benefit.
### MVP Generator
Produces minimum architecture artifacts: workflows, data objects, API requirements, and feature map.
### Utility Prioritizer
Retains only features with validated claim linkage.
### Feedback Capture
Processes post-launch analytics and qualitative outcomes.
### Iteration Gate
Decides: scale, revise, remove, or re-validate.
### Local Model Profile Registry
Persists profile-level model settings for weights, thresholds, and generation options.
### UI Control Surface
Provides local operator controls for profile management, loop execution, and feedback decisions.
### Guided Learning Layer
Provides an in-app module map, quick navigation controls, and short tutorial flow so operators can learn all utilities directly inside the interface.
### Knowledge Base Protocol Engine
Generates standardized Problem -> Solution -> Value artifacts with attribution, transparency blocks, and conflict checks for unsupported protocol constraints.
### Constraint Compatibility Gate
Evaluates requested protocol constraints and reports supported, partial, conflicting, and review-required items for operator governance.
### AI Update Audit and Traceability
Enforces append-only logging for all AI-assisted code or documentation updates in `docs/AI_AGENT_UPDATE_AUDIT_LOG.md`.
### Desktop Runtime Wrapper
Runs the same local backend and UI inside an Electron window so the product behaves as a native desktop application that opens/closes as a single app.
## Loop rule
- Weak evidence: stop feature development.
- Strong evidence: ship minimum functional version.
- Positive utility feedback: scale.
- Negative utility feedback: revise or remove.
