#!/usr/bin/env node

import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadStateStore() {
  const candidates = [
    join(__dirname, "..", "store", "state-store.js"),
    join(__dirname, "..", "dist", "store", "state-store.js"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return import(pathToFileURL(candidate).href);
    }
  }

  throw new Error("Could not locate state-store.js");
}

function printHelp() {
  console.log(`loophaus — Iterative coding loop

USAGE:
  /loop [PROMPT...] [OPTIONS]

ARGUMENTS:
  PROMPT...    Initial prompt to start the loop

OPTIONS:
  --max-iterations <n>           Maximum iterations before auto-stop (default: unlimited)
  --completion-promise <text>    Promise phrase for explicit completion
  -h, --help                     Show this help message`);
}

function parseArgs(argv) {
  const promptParts = [];
  let maxIterations = 0;
  let completionPromise = "";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--max-iterations") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--max-iterations requires a number argument");
      }
      if (!/^\d+$/.test(value)) {
        throw new Error(`--max-iterations must be a positive integer or 0, got: ${value}`);
      }
      maxIterations = Number.parseInt(value, 10);
      i += 1;
      continue;
    }
    if (arg === "--completion-promise") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--completion-promise requires a text argument");
      }
      completionPromise = value;
      i += 1;
      continue;
    }
    promptParts.push(arg);
  }

  const prompt = promptParts.join(" ").trim();
  if (!prompt) {
    throw new Error("No prompt provided");
  }

  return { prompt, maxIterations, completionPromise };
}

async function main() {
  const { readState, writeState } = await loadStateStore();
  const { prompt, maxIterations, completionPromise } = parseArgs(process.argv.slice(2));
  const existingState = await readState(process.cwd());
  const sessionId =
    process.env.CLAUDE_CODE_SESSION_ID ||
    process.env.CODEX_SESSION_ID ||
    process.env.SESSION_ID ||
    "";

  await writeState({
    ...existingState,
    active: true,
    prompt,
    completionPromise,
    maxIterations,
    currentIteration: 0,
    sessionId,
    startedAt: new Date().toISOString(),
  }, process.cwd());

  console.log("Loop activated!");
  console.log("");
  console.log("Iteration: 1");
  console.log(`Max iterations: ${maxIterations > 0 ? maxIterations : "unlimited"}`);
  console.log(`Completion promise: ${completionPromise || "none (runs until stopped or max iterations)"}`);
  console.log("");
  console.log("The stop hook is now active. When you try to exit, the same prompt will be fed back.");
  console.log("To cancel: /loop-stop");
  console.log("To monitor: read .loophaus/state.json");
  console.log("");
  console.log(prompt);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
