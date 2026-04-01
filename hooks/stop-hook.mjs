#!/usr/bin/env node

import { evaluateStopHook } from "../core/engine.js";
import { getLastAssistantText, hasPendingStories } from "../core/io-helpers.js";
import { read as readState, write as writeState } from "../store/state-store.mjs";
import { logEvents } from "../core/event-logger.js";
import { join } from "node:path";

async function runStoryTests(cwd) {
  const { readFile } = await import("node:fs/promises");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const prdPath = join(cwd, "prd.json");

  try {
    const prd = JSON.parse(await readFile(prdPath, "utf-8"));
    if (!Array.isArray(prd.userStories)) return [];

    const results = [];
    for (const story of prd.userStories) {
      if (!story.testCommand || story.passes) continue;
      try {
        await execFileAsync("sh", ["-c", story.testCommand], { cwd, timeout: 60_000 });
        results.push({ storyId: story.id, passed: true });
      } catch (err) {
        results.push({ storyId: story.id, passed: false, error: err.message });
      }
    }
    return results;
  } catch { return []; }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  let hookInput = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) hookInput = JSON.parse(raw);
  } catch { /* empty input */ }

  const cwd = hookInput.cwd || process.cwd();
  const state = await readState(cwd);

  const lastText = hookInput.last_assistant_message ||
    await getLastAssistantText(hookInput.transcript_path || null);
  const pending = await hasPendingStories(cwd);

  // Run verify script if configured
  let verifyResult = null;
  if (state.verifyScript) {
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execFileAsync = promisify(execFile);
      const { stdout: vOut } = await execFileAsync(state.verifyScript, [], { cwd, timeout: 30_000 });
      verifyResult = { passed: true, output: vOut.trim() };
    } catch (err) {
      verifyResult = { passed: false, output: err.stderr || err.message };
    }
  }

  // Run story tests if prd.json has testCommand fields
  const testResults = await runStoryTests(cwd);

  // Evaluate loop policy
  const { loadPolicy, evaluatePolicy } = await import("../core/policy.js");
  const policy = await loadPolicy(cwd);
  const policyResult = evaluatePolicy(policy, state, { totalCost: 0, errorCount: 0 });

  const input = {
    ...hookInput,
    last_assistant_text: lastText,
    has_pending_stories: pending,
    verify_result: verifyResult,
    test_results: testResults,
    policy_result: policyResult,
  };

  const result = evaluateStopHook(input, state);

  await writeState(result.nextState, cwd);
  await logEvents(result.events, { adapter: "auto", loop_id: state.sessionId || "unknown" }, cwd);

  // Save session checkpoint (best-effort)
  try {
    const { saveCheckpoint } = await import("../core/session.js");
    await saveCheckpoint(result.nextState.sessionId || `auto-${Date.now()}`, {
      prompt: result.nextState.prompt,
      completionPromise: result.nextState.completionPromise,
      maxIterations: result.nextState.maxIterations,
      currentIteration: result.nextState.currentIteration,
      name: result.nextState.name,
      startedAt: result.nextState.startedAt,
    }, cwd);
  } catch { /* best-effort */ }

  if (result.message) process.stderr.write(result.message + "\n");
  if (result.output) process.stdout.write(JSON.stringify(result.output));
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`loophaus stop-hook error: ${err.message}\n`);
  process.exit(0);
});
