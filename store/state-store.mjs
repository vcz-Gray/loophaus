import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { validateState } from "../core/validate.mjs";

const DEFAULT_STATE = {
  active: false,
  prompt: "",
  completionPromise: "TADA",
  maxIterations: 20,
  currentIteration: 0,
  sessionId: "",
};

export function getStatePath(cwd, name) {
  if (process.env.LOOPHAUS_STATE_FILE) return process.env.LOOPHAUS_STATE_FILE;
  if (process.env.RALPH_STATE_FILE) return process.env.RALPH_STATE_FILE;
  const base = cwd || process.cwd();
  if (name) return join(base, ".loophaus", "loops", name, "state.json");
  return join(base, ".loophaus", "state.json");
}

const LEGACY_PATHS = [
  (cwd) => join(cwd, ".codex", "ralph-loop.state.json"),
  (cwd) => join(cwd, ".claude", "ralph-loop.local.md"),
];

export async function read(cwd, name) {
  const primary = getStatePath(cwd, name);

  try {
    const raw = await readFile(primary, "utf-8");
    const state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
    const result = validateState(state);
    if (!result.valid) {
      process.stderr.write(`loophaus: state validation warning: ${result.errors.join(", ")}\n`);
    }
    return state;
  } catch {
    // Primary not found, try legacy paths
  }

  const dir = cwd || process.cwd();
  for (const pathFn of LEGACY_PATHS) {
    const legacyPath = pathFn(dir);
    try {
      const raw = await readFile(legacyPath, "utf-8");
      if (legacyPath.endsWith(".md")) {
        return migrateMdFormat(raw);
      }
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
      continue;
    }
  }

  return { ...DEFAULT_STATE };
}

export async function write(state, cwd, name) {
  const result = validateState(state);
  if (!result.valid) {
    process.stderr.write(`loophaus: writing invalid state: ${result.errors.join(", ")}\n`);
  }
  const statePath = getStatePath(cwd, name);
  await mkdir(dirname(statePath), { recursive: true });
  const tmp = statePath + ".tmp";
  await writeFile(tmp, JSON.stringify(state, null, 2), "utf-8");
  await rename(tmp, statePath);
}

export async function reset(cwd) {
  await write({ ...DEFAULT_STATE }, cwd);
}

function migrateMdFormat(raw) {
  const state = { ...DEFAULT_STATE };
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === "active") state.active = value.trim() === "true";
    else if (key === "iteration") state.currentIteration = parseInt(value.trim(), 10) || 0;
    else if (key === "max_iterations") state.maxIterations = parseInt(value.trim(), 10) || 20;
    else if (key === "completion_promise") state.completionPromise = value.trim();
    else if (key === "prompt") state.prompt = value.trim();
    else if (key === "session_id") state.sessionId = value.trim();
  }
  return state;
}

// Backward-compatible exports (matching lib/state.mjs interface)
export async function readState(cwd) { return read(cwd); }
export async function writeState(state, cwd) { return write(state, cwd); }
export async function resetState(cwd) { return reset(cwd); }
export async function incrementIteration(cwd) {
  const state = await read(cwd);
  state.currentIteration += 1;
  await write(state, cwd);
  return state;
}

export { DEFAULT_STATE };
