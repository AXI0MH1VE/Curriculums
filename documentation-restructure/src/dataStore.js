/**
 * Data Store — Persistent JSON-backed Domain Entity Store
 * -------------------------------------------------------
 * Replaces the in-memory Map store with a structured file-backed
 * persistence layer for all domain objects. All entities are stored
 * in `data/store.json` and flushed on every write.
 *
 * Attribution: AXIOM HIVE XPII — Nicholas Michael Grossi, Alexis Adams
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

// ─── Schema Defaults ────────────────────────────────────────

function createEmptyStore() {
  return {
    concepts: {},
    claims: {},
    evidenceSources: {},
    evidenceItems: {},
    evidenceScores: {},
    features: {},
    featureClaimLinks: [],
    mvpArchitectures: {},
    interfaceDesigns: {},
    workflows: {},
    dataModelEntities: {},
    apiEndpoints: {},
    techStackChoices: {},
    userFeedback: {},
    usageEvents: {},
    featureDecisions: {},
    validationRuns: {},
    loopStates: {},
    auditLog: [],
    evaluations: {}
  };
}

// ─── Persistence ────────────────────────────────────────────

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore() {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(STORE_PATH)) {
      const empty = createEmptyStore();
      fs.writeFileSync(STORE_PATH, `${JSON.stringify(empty, null, 2)}\n`, "utf8");
      return empty;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    // Merge with defaults for forward-compatibility
    return { ...createEmptyStore(), ...parsed };
  } catch (_error) {
    return createEmptyStore();
  }
}

function flushStore() {
  ensureDataDirectory();
  fs.writeFileSync(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

// ─── In-Memory State ────────────────────────────────────────

const store = loadStore();

// ─── Generic CRUD Helpers ───────────────────────────────────

export function getCollection(collectionName) {
  return store[collectionName] ?? {};
}

export function getEntity(collectionName, id) {
  const collection = store[collectionName];
  if (!collection) return null;
  return collection[id] ?? null;
}

export function putEntity(collectionName, id, entity) {
  if (!store[collectionName]) {
    store[collectionName] = {};
  }
  store[collectionName][id] = entity;
  flushStore();
  return entity;
}

export function deleteEntity(collectionName, id) {
  if (store[collectionName] && store[collectionName][id]) {
    delete store[collectionName][id];
    flushStore();
    return true;
  }
  return false;
}

export function listEntities(collectionName) {
  const collection = store[collectionName];
  if (!collection || typeof collection !== "object") return [];
  return Object.values(collection);
}

export function queryEntities(collectionName, predicate) {
  return listEntities(collectionName).filter(predicate);
}

// ─── Array-based Collections ────────────────────────────────

export function appendToArray(collectionName, entry) {
  if (!Array.isArray(store[collectionName])) {
    store[collectionName] = [];
  }
  store[collectionName].push(entry);
  flushStore();
  return entry;
}

export function getArray(collectionName) {
  return Array.isArray(store[collectionName]) ? store[collectionName] : [];
}

export function queryArray(collectionName, predicate) {
  return getArray(collectionName).filter(predicate);
}

// ─── Legacy Evaluation Compatibility ────────────────────────

export function saveEvaluation(id, result) {
  putEntity("evaluations", id, {
    id,
    createdAt: new Date().toISOString(),
    result
  });
}

export function getEvaluation(id) {
  return getEntity("evaluations", id);
}

// ─── Audit Log (Append-Only) ────────────────────────────────

export function appendAuditEntry(entry) {
  return appendToArray("auditLog", {
    ...entry,
    created_at: new Date().toISOString()
  });
}

export function getAuditLog(conceptId) {
  if (!conceptId) return getArray("auditLog");
  return queryArray("auditLog", (e) => e.entity_id === conceptId || e.concept_id === conceptId);
}
