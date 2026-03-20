#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readState, writeState } from "../lib/state.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function extractPromise(text, promisePhrase) {
  const regex = new RegExp(
    `<promise>\\s*${escapeRegex(promisePhrase)}\\s*</promise>`,
    "s",
  );
  return regex.test(text);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getLastAssistantText(transcriptPath) {
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

async function hasPendingStories(cwd) {
  const prdPath = join(cwd || process.cwd(), "prd.json");
  try {
    const raw = await readFile(prdPath, "utf-8");
    const prd = JSON.parse(raw);
    if (!Array.isArray(prd.userStories)) return false;
    return prd.userStories.some((s) => s.passes === false);
  } catch {
    // No prd.json or malformed — cannot determine, treat as no pending
    return false;
  }
}

async function main() {
  let hookInput = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) {
      hookInput = JSON.parse(raw);
    }
  } catch {
    // no stdin or malformed — proceed with empty input
  }

  const state = await readState();

  // Not active — allow exit silently
  if (!state.active) {
    process.exit(0);
  }

  // Session isolation: if state has a sessionId, only match that session
  if (
    state.sessionId &&
    hookInput.session_id &&
    state.sessionId !== hookInput.session_id
  ) {
    process.exit(0);
  }

  // Increment iteration
  state.currentIteration += 1;

  // Check max iterations
  if (state.maxIterations > 0 && state.currentIteration > state.maxIterations) {
    process.stderr.write(
      `Ralph loop: max iterations (${state.maxIterations}) reached.\n`,
    );
    state.active = false;
    await writeState(state);
    process.exit(0);
  }

  // Check completion promise in transcript
  if (state.completionPromise) {
    const lastText =
      hookInput.last_assistant_message ||
      (await getLastAssistantText(hookInput.transcript_path || null));

    if (lastText && extractPromise(lastText, state.completionPromise)) {
      process.stderr.write(
        `Ralph loop: completion promise "${state.completionPromise}" detected.\n`,
      );
      state.active = false;
      await writeState(state);
      process.exit(0);
    }
  }

  // Hybrid stop_hook_active handling:
  // When stop_hook_active=true, the agent already continued once from a previous block.
  // Instead of blindly blocking again (which causes forced termination),
  // check prd.json for pending stories. Only block if there's still work to do.
  if (hookInput.stop_hook_active === true) {
    const cwd = hookInput.cwd || process.cwd();
    const pending = await hasPendingStories(cwd);

    if (!pending) {
      // All stories done or no prd.json — allow exit
      process.stderr.write(
        "Ralph loop: stop_hook_active=true, no pending stories. Allowing exit.\n",
      );
      state.active = false;
      await writeState(state);
      process.exit(0);
    }

    // Pending stories exist — continue even though stop_hook_active=true
    process.stderr.write(
      "Ralph loop: stop_hook_active=true, but pending stories found. Continuing.\n",
    );
  }

  // Save updated iteration
  await writeState(state);

  // Build continuation prompt
  const iterInfo =
    state.maxIterations > 0
      ? `${state.currentIteration}/${state.maxIterations}`
      : `${state.currentIteration}`;

  const reason = [
    state.prompt,
    "",
    "---",
    `Ralph Loop iteration ${iterInfo}. Continue working on the task above.`,
  ].join("\n");

  const output = {
    decision: "block",
    reason,
  };

  if (state.completionPromise) {
    output.systemMessage = `Ralph iteration ${iterInfo} | To stop: output <promise>${state.completionPromise}</promise> (ONLY when TRUE)`;
  } else {
    output.systemMessage = `Ralph iteration ${iterInfo} | No completion promise — loop runs until max iterations`;
  }

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Ralph stop-hook error: ${err.message}\n`);
  process.exit(0);
});
