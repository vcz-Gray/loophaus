import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const DEFAULT_STATE = {
  active: false,
  prompt: "",
  completionPromise: "TADA",
  maxIterations: 20,
  currentIteration: 0,
  sessionId: "",
};

export function getStatePath() {
  return (
    process.env.LOOPHAUS_STATE_FILE ||
    process.env.RALPH_STATE_FILE ||
    join(process.cwd(), ".loophaus", "state.json")
  );
}

export async function readState() {
  const statePath = getStatePath();
  try {
    const raw = await readFile(statePath, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function writeState(state) {
  const statePath = getStatePath();
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

export async function resetState() {
  await writeState({ ...DEFAULT_STATE });
}

export async function incrementIteration() {
  const state = await readState();
  state.currentIteration += 1;
  await writeState(state);
  return state;
}
