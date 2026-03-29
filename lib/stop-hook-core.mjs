import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function extractPromise(text, promisePhrase) {
  const regex = new RegExp(
    `<promise>\\s*${escapeRegex(promisePhrase)}\\s*</promise>`,
    "s",
  );
  return regex.test(text);
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getLastAssistantText(transcriptPath) {
  if (!transcriptPath) return "";
  try {
    const raw = await readFile(transcriptPath, "utf-8");
    const lines = raw.trim().split("\n");
    const assistantLines = lines.filter((line) => {
      try {
        const obj = JSON.parse(line);
        return obj.role === "assistant";
      } catch {
        return false;
      }
    });
    const recent = assistantLines.slice(-100);
    for (let i = recent.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(recent[i]);
        const contents = obj.message?.content || obj.content;
        if (Array.isArray(contents)) {
          for (let j = contents.length - 1; j >= 0; j--) {
            if (contents[j].type === "text" && contents[j].text) {
              return contents[j].text;
            }
          }
        } else if (typeof contents === "string") {
          return contents;
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // transcript not found or unreadable
  }
  return "";
}

export async function hasPendingStories(cwd) {
  const prdPath = join(cwd || process.cwd(), "prd.json");
  try {
    const raw = await readFile(prdPath, "utf-8");
    const prd = JSON.parse(raw);
    if (!Array.isArray(prd.userStories)) return false;
    return prd.userStories.some((s) => s.passes === false);
  } catch {
    return false;
  }
}

export async function processStopHook(hookInput, readStateFn, writeStateFn) {
  const stderr = [];
  const state = await readStateFn();

  // Not active — allow exit
  if (!state.active) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  // Session isolation
  if (
    state.sessionId &&
    hookInput.session_id &&
    state.sessionId !== hookInput.session_id
  ) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  // Increment iteration
  state.currentIteration += 1;

  // Check max iterations
  if (state.maxIterations > 0 && state.currentIteration > state.maxIterations) {
    stderr.push(
      `Loop: max iterations (${state.maxIterations}) reached.\n`,
    );
    state.active = false;
    await writeStateFn(state);
    return { exitCode: 0, stdout: "", stderr: stderr.join("") };
  }

  // Check completion promise
  if (state.completionPromise) {
    const lastText =
      hookInput.last_assistant_message ||
      (await getLastAssistantText(hookInput.transcript_path || null));

    if (lastText && extractPromise(lastText, state.completionPromise)) {
      stderr.push(
        `Loop: completion promise "${state.completionPromise}" detected.\n`,
      );
      state.active = false;
      await writeStateFn(state);
      return { exitCode: 0, stdout: "", stderr: stderr.join("") };
    }
  }

  // Hybrid stop_hook_active handling:
  // When true, the agent already continued from a previous block.
  // Check prd.json for pending stories — only block if work remains.
  if (hookInput.stop_hook_active === true) {
    const cwd = hookInput.cwd || process.cwd();
    const pending = await hasPendingStories(cwd);

    if (!pending) {
      stderr.push(
        "Loop: stop_hook_active=true, no pending stories. Allowing exit.\n",
      );
      state.active = false;
      await writeStateFn(state);
      return { exitCode: 0, stdout: "", stderr: stderr.join("") };
    }

    stderr.push(
      "Loop: stop_hook_active=true, pending stories found. Continuing.\n",
    );
  }

  // Save updated iteration
  await writeStateFn(state);

  // Build continuation prompt
  const iterInfo =
    state.maxIterations > 0
      ? `${state.currentIteration}/${state.maxIterations}`
      : `${state.currentIteration}`;

  const reason = [
    state.prompt,
    "",
    "---",
    `Loop iteration ${iterInfo}. Continue working on the task above.`,
  ].join("\n");

  const output = { decision: "block", reason };

  if (state.completionPromise) {
    output.systemMessage = `Loop iteration ${iterInfo} | To stop: output <promise>${state.completionPromise}</promise> (ONLY when TRUE)`;
  } else {
    output.systemMessage = `Loop iteration ${iterInfo} | No completion promise — loop runs until max iterations`;
  }

  return {
    exitCode: 0,
    stdout: JSON.stringify(output),
    stderr: stderr.join(""),
  };
}
