const sessions = new Map();

export function saveEvaluation(id, result) {
  sessions.set(id, {
    id,
    createdAt: new Date().toISOString(),
    result
  });
}

export function getEvaluation(id) {
  return sessions.get(id) ?? null;
}
