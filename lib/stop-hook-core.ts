import { evaluateStopHook, extractPromise } from "../core/engine.js";
import { getLastAssistantText, hasPendingStories } from "../core/io-helpers.js";
import type { LoopState, StopHookInput, LoopEvent } from "../core/types.js";

export { extractPromise, getLastAssistantText, hasPendingStories };

export interface StopHookProcessInput {
  last_assistant_message?: string;
  transcript_path?: string;
  session_id?: string;
  cwd?: string;
  stop_hook_active?: boolean;
  [key: string]: unknown;
}

export interface StopHookProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function processStopHook(
  hookInput: StopHookProcessInput,
  readStateFn: () => Promise<LoopState>,
  writeStateFn: (state: LoopState) => Promise<void>,
): Promise<StopHookProcessResult> {
  const state = await readStateFn();

  if (!state.active) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (state.sessionId && hookInput.session_id && state.sessionId !== hookInput.session_id) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  const lastText = hookInput.last_assistant_message ||
    await getLastAssistantText(hookInput.transcript_path ?? undefined);
  const pending = await hasPendingStories(hookInput.cwd || process.cwd());

  const input: StopHookInput = {
    ...hookInput,
    last_assistant_text: lastText,
    has_pending_stories: pending,
    stop_hook_active: hookInput.stop_hook_active ?? false,
    session_id: hookInput.session_id ?? "",
  };

  const result = evaluateStopHook(input, state);

  await writeStateFn(result.nextState);

  const stderrParts: string[] = [];
  if (result.message) stderrParts.push(result.message);
  for (const ev of result.events || [] as LoopEvent[]) {
    if (ev.event === "continue" && ev.reason === "pending_stories") {
      stderrParts.push("Loop: stop_hook_active=true, pending stories found. Continuing.");
    }
  }
  const stderr = stderrParts.length ? stderrParts.join("\n") + "\n" : "";
  const stdout = result.output ? JSON.stringify(result.output) : "";

  return { exitCode: 0, stdout, stderr };
}
