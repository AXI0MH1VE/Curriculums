import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MODEL_CONFIG, normalizeModelConfig, validateProfileName } from "./modelConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const PROFILES_PATH = path.join(DATA_DIR, "model-profiles.json");
const DEFAULT_PROFILE_NAME = "minimalist";

const DEFAULT_RECORD = {
  activeProfile: DEFAULT_PROFILE_NAME,
  profiles: {
    [DEFAULT_PROFILE_NAME]: normalizeModelConfig(DEFAULT_MODEL_CONFIG)
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sanitizeRecord(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return deepClone(DEFAULT_RECORD);
  }

  const sanitizedProfiles = {};
  const rawProfiles = input.profiles && typeof input.profiles === "object" ? input.profiles : {};

  for (const [name, config] of Object.entries(rawProfiles)) {
    try {
      validateProfileName(name);
      sanitizedProfiles[name] = normalizeModelConfig(config);
    } catch (_error) {
      continue;
    }
  }

  if (Object.keys(sanitizedProfiles).length === 0) {
    sanitizedProfiles[DEFAULT_PROFILE_NAME] = normalizeModelConfig(DEFAULT_MODEL_CONFIG);
  }

  const activeProfile =
    typeof input.activeProfile === "string" && sanitizedProfiles[input.activeProfile]
      ? input.activeProfile
      : Object.keys(sanitizedProfiles)[0];

  return {
    activeProfile,
    profiles: sanitizedProfiles
  };
}

function loadRecord() {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(PROFILES_PATH)) {
      fs.writeFileSync(PROFILES_PATH, `${JSON.stringify(DEFAULT_RECORD, null, 2)}\n`, "utf8");
      return deepClone(DEFAULT_RECORD);
    }

    const raw = fs.readFileSync(PROFILES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return sanitizeRecord(parsed);
  } catch (_error) {
    return deepClone(DEFAULT_RECORD);
  }
}

function saveRecord(record) {
  ensureDataDirectory();
  fs.writeFileSync(PROFILES_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

const profileState = loadRecord();

export function listModelProfiles() {
  return Object.entries(profileState.profiles).map(([name, config]) => ({
    name,
    config: deepClone(config),
    isActive: name === profileState.activeProfile
  }));
}

export function getActiveModelProfile() {
  const activeName = profileState.activeProfile;
  return {
    name: activeName,
    config: deepClone(profileState.profiles[activeName])
  };
}

export function upsertModelProfile(name, config) {
  validateProfileName(name);
  profileState.profiles[name] = normalizeModelConfig(config);
  if (!profileState.activeProfile) {
    profileState.activeProfile = name;
  }
  saveRecord(profileState);
  return {
    name,
    config: deepClone(profileState.profiles[name]),
    isActive: profileState.activeProfile === name
  };
}

export function activateModelProfile(name) {
  validateProfileName(name);
  if (!profileState.profiles[name]) {
    throw new Error(`profile ${name} does not exist`);
  }
  profileState.activeProfile = name;
  saveRecord(profileState);
  return getActiveModelProfile();
}

export function deleteModelProfile(name) {
  validateProfileName(name);
  if (name === DEFAULT_PROFILE_NAME) {
    throw new Error("default profile cannot be deleted");
  }
  if (!profileState.profiles[name]) {
    throw new Error(`profile ${name} does not exist`);
  }

  delete profileState.profiles[name];
  if (profileState.activeProfile === name) {
    profileState.activeProfile = DEFAULT_PROFILE_NAME;
  }
  saveRecord(profileState);
}
