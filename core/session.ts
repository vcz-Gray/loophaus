import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface CheckpointData {
  [key: string]: unknown;
}

interface Checkpoint extends CheckpointData {
  sessionId: string;
  savedAt: string;
}

interface SessionData {
  savedAt: string;
  [key: string]: unknown;
}

function getSessionsDir(cwd?: string): string {
  return join(cwd || process.cwd(), ".loophaus", "sessions");
}

function validateSessionId(id: string): void {
  if (!id || typeof id !== "string") throw new Error("Session ID is required");
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
    throw new Error(`Invalid session ID: ${id}. Use alphanumeric, dot, dash, or underscore only.`);
  }
}

export async function saveCheckpoint(sessionId: string, data: CheckpointData, cwd?: string): Promise<Checkpoint> {
  validateSessionId(sessionId);
  const dir = getSessionsDir(cwd);
  await mkdir(dir, { recursive: true });
  const checkpoint: Checkpoint = {
    sessionId,
    savedAt: new Date().toISOString(),
    ...data,
  };
  await writeFile(join(dir, `${sessionId}.json`), JSON.stringify(checkpoint, null, 2), "utf-8");
  return checkpoint;
}

export async function loadCheckpoint(sessionId: string, cwd?: string): Promise<Checkpoint | null> {
  validateSessionId(sessionId);
  const dir = getSessionsDir(cwd);
  try {
    const raw = await readFile(join(dir, `${sessionId}.json`), "utf-8");
    return JSON.parse(raw) as Checkpoint;
  } catch {
    return null;
  }
}

export async function listSessions(cwd?: string): Promise<SessionData[]> {
  const dir = getSessionsDir(cwd);
  try {
    const files = await readdir(dir);
    const sessions: SessionData[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        const data = JSON.parse(raw) as SessionData;
        sessions.push(data);
      } catch { /* skip malformed */ }
    }
    return sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch {
    return [];
  }
}

interface ResumeCheckpoint {
  prompt?: string;
  completionPromise?: string;
  maxIterations?: number;
  currentIteration?: number;
  sessionId: string;
  name?: string;
  startedAt?: string;
}

interface ResumedState {
  active: boolean;
  prompt: string;
  completionPromise: string;
  maxIterations: number;
  currentIteration: number;
  sessionId: string;
  name: string;
  startedAt: string;
}

export async function resumeSession(sessionId: string, cwd?: string): Promise<ResumedState | null> {
  const checkpoint = await loadCheckpoint(sessionId, cwd) as ResumeCheckpoint | null;
  if (!checkpoint) return null;

  const stateStore = await import("../store/state-store.js");
  const write = stateStore.write as unknown as (state: ResumedState, cwd?: string, name?: string) => Promise<void>;
  const state: ResumedState = {
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
