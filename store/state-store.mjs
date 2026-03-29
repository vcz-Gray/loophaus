import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";

const DEFAULT_STATE = {
  active: false,
  prompt: "",
  completionPromise: "TADA",
  maxIterations: 20,
  currentIteration: 0,
  sessionId: "",
};

export function getStatePath(cwd) {
  if (process.env.LOOPHAUS_STATE_FILE) return process.env.LOOPHAUS_STATE_FILE;
  if (process.env.RALPH_STATE_FILE) return process.env.RALPH_STATE_FILE;
  return join(cwd || process.cwd(), ".loophaus", "state.json");
}

const LEGACY_PATHS = [
  (cwd) => join(cwd, ".codex", "ralph-loop.state.json"),
  (cwd) => join(cwd, ".claude", "ralph-loop.local.md"),
];

export async function read(cwd) {
  const primary = getStatePath(cwd);

  try {
    const raw = await readFile(primary, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
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

export async function write(state, cwd) {
  const statePath = getStatePath(cwd);
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

export { DEFAULT_STATE };
