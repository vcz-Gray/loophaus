#!/usr/bin/env node

import { evaluateStopHook } from "../core/engine.mjs";
import { getLastAssistantText, hasPendingStories } from "../core/io-helpers.mjs";
import { read as readState, write as writeState } from "../store/state-store.mjs";
import { logEvents } from "../core/event-logger.mjs";

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

  const input = {
    ...hookInput,
    last_assistant_text: lastText,
    has_pending_stories: pending,
    verify_result: verifyResult,
  };

  const result = evaluateStopHook(input, state);

  await writeState(result.nextState, cwd);
  await logEvents(result.events, { adapter: "auto", loop_id: state.sessionId || "unknown" }, cwd);

  if (result.message) process.stderr.write(result.message + "\n");
  if (result.output) process.stdout.write(JSON.stringify(result.output));
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`loophaus stop-hook error: ${err.message}\n`);
  process.exit(0);
});
