import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

function getSessionsDir(cwd) {
  return join(cwd || process.cwd(), ".loophaus", "sessions");
}

export async function saveCheckpoint(sessionId, data, cwd) {
  const dir = getSessionsDir(cwd);
  await mkdir(dir, { recursive: true });
  const checkpoint = {
    sessionId,
    savedAt: new Date().toISOString(),
    ...data,
  };
  await writeFile(join(dir, `${sessionId}.json`), JSON.stringify(checkpoint, null, 2), "utf-8");
  return checkpoint;
}

export async function loadCheckpoint(sessionId, cwd) {
  const dir = getSessionsDir(cwd);
  try {
    const raw = await readFile(join(dir, `${sessionId}.json`), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listSessions(cwd) {
  const dir = getSessionsDir(cwd);
  try {
    const files = await readdir(dir);
    const sessions = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        const data = JSON.parse(raw);
        sessions.push(data);
      } catch { /* skip malformed */ }
    }
    return sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch {
    return [];
  }
}

export async function resumeSession(sessionId, cwd) {
  const checkpoint = await loadCheckpoint(sessionId, cwd);
  if (!checkpoint) return null;

  const { write } = await import("../store/state-store.mjs");
  const state = {
    active: true,
    prompt: checkpoint.prompt || "",
    completionPromise: checkpoint.completionPromise || "TADA",
    maxIterations: checkpoint.maxIterations || 20,
    currentIteration: checkpoint.currentIteration || 0,
    sessionId: checkpoint.sessionId,
    name: checkpoint.name || "",
    startedAt: checkpoint.startedAt || new Date().toISOString(),
  };
  await write(state, cwd, checkpoint.name);
  return state;
}
