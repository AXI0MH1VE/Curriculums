/**
 * Audit & Governance Module
 * -------------------------
 * Append-only logging of all critical changes across domain entities.
 * Generates markdown-compatible audit trails and enforces immutability.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import crypto from "node:crypto";
import { appendAuditEntry, getAuditLog } from "../dataStore.js";

/**
 * Log a domain action to the immutable audit trail.
 * @param {Object} params
 * @param {string} params.entity_type - e.g. "CONCEPT", "CLAIM", "FEATURE", "MVP_ARCHITECTURE"
 * @param {string} params.entity_id - UUID of the entity
 * @param {string} params.action - e.g. "CREATE", "UPDATE", "STATUS_CHANGE", "DECISION", "EVIDENCE_ADDED"
 * @param {Object|string} params.details - Immutable change details
 * @param {string} [params.actor_id] - User or SYSTEM
 * @param {string} [params.concept_id] - Cross-reference to parent concept
 */
export function logAction({ entity_type, entity_id, action, details, actor_id, concept_id }) {
  return appendAuditEntry({
    audit_id: crypto.randomUUID(),
    entity_type,
    entity_id,
    concept_id: concept_id ?? entity_id,
    action,
    details: typeof details === "string" ? details : JSON.parse(JSON.stringify(details)),
    actor_id: actor_id ?? "SYSTEM"
  });
}

/**
 * Export the full audit trail for a concept as a structured array.
 * @param {string} [conceptId] - Filter by concept; omit for full log
 * @returns {Array} Audit entries
 */
export function exportAuditTrail(conceptId) {
  return getAuditLog(conceptId);
}

/**
 * Export the audit trail as markdown text.
 * @param {string} [conceptId]
 * @returns {string} Markdown-formatted audit log
 */
export function exportAuditTrailMarkdown(conceptId) {
  const entries = exportAuditTrail(conceptId);
  if (entries.length === 0) {
    return "# Audit Trail\n\nNo entries recorded.\n";
  }

  const lines = ["# Audit Trail", ""];

  for (const entry of entries) {
    lines.push(`## ${entry.action} — ${entry.entity_type}`);
    lines.push(`- **Audit ID:** ${entry.audit_id}`);
    lines.push(`- **Entity ID:** ${entry.entity_id}`);
    lines.push(`- **Actor:** ${entry.actor_id}`);
    lines.push(`- **Timestamp:** ${entry.created_at}`);
    lines.push(`- **Details:** \`${JSON.stringify(entry.details)}\``);
    lines.push("");
  }

  return lines.join("\n");
}
