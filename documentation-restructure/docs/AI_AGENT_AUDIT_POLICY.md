# AI Agent Audit Policy
> Timestamp (UTC): 2026-03-27T02:15:16Z
## Purpose
Define mandatory audit behavior for any AI agent that provides code updates, documentation updates, or operational assistance in this application.
## Mandatory Rules
1. Every AI-assisted update must be recorded in `docs/AI_AGENT_UPDATE_AUDIT_LOG.md`.
2. The audit log is append-only:
   - Existing entries must not be edited, rewritten, or deleted.
   - Corrections must be added as new entries referencing the prior entry ID.
3. Audit log updates must reflect only actual updates provided in that interaction.
4. Each audit entry must include:
   - UTC timestamp
   - agent identifier (or `unknown`)
   - operator identifier (if supplied)
   - change scope (`code`, `documentation`, `assistance`, or combinations)
   - files changed
   - summary of updates
   - verification status
5. All markdown documents in this repository must contain a UTC timestamp and must update that timestamp when the document changes.
## Workflow
1. Perform update.
2. Verify update scope and changed files.
3. Append a new entry to `docs/AI_AGENT_UPDATE_AUDIT_LOG.md`.
4. Do not modify previous entries.
5. Submit for operator review and approval.
## Enforcement Note
If an update is completed without an audit entry, the update is considered incomplete until an append-only log entry is added.
