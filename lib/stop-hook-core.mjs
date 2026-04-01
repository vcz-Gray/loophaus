import { evaluateStopHook, extractPromise } from "../core/engine.js";
import { getLastAssistantText, hasPendingStories } from "../core/io-helpers.js";

export { extractPromise, getLastAssistantText, hasPendingStories };

export async function processStopHook(hookInput, readStateFn, writeStateFn) {
  const state = await readStateFn();

  if (!state.active) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (state.sessionId && hookInput.session_id && state.sessionId !== hookInput.session_id) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  const lastText = hookInput.last_assistant_message ||
    await getLastAssistantText(hookInput.transcript_path || null);
  const pending = await hasPendingStories(hookInput.cwd || process.cwd());

  const input = {
    ...hookInput,
    last_assistant_text: lastText,
    has_pending_stories: pending,
  };

  const result = evaluateStopHook(input, state);

  await writeStateFn(result.nextState);

  const stderrParts = [];
  if (result.message) stderrParts.push(result.message);
  for (const ev of result.events || []) {
    if (ev.event === "continue" && ev.reason === "pending_stories") {
      stderrParts.push("Loop: stop_hook_active=true, pending stories found. Continuing.");
    }
  }
  const stderr = stderrParts.length ? stderrParts.join("\n") + "\n" : "";
  const stdout = result.output ? JSON.stringify(result.output) : "";

  return { exitCode: 0, stdout, stderr };
}
