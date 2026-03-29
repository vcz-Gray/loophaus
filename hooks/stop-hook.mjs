#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluateStopHook } from "../core/engine.mjs";
import { read as readState, write as writeState } from "../store/state-store.mjs";
import { logEvents } from "../core/event-logger.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

async function getLastAssistantText(transcriptPath) {
  if (!transcriptPath) return "";
  try {
    const raw = await readFile(transcriptPath, "utf-8");
    const lines = raw.trim().split("\n");
    const recent = lines.filter((line) => {
      try { return JSON.parse(line).role === "assistant"; } catch { return false; }
    }).slice(-100);
    for (let i = recent.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(recent[i]);
        const contents = obj.message?.content || obj.content;
        if (Array.isArray(contents)) {
          for (let j = contents.length - 1; j >= 0; j--) {
            if (contents[j].type === "text" && contents[j].text) return contents[j].text;
          }
        } else if (typeof contents === "string") return contents;
      } catch { /* skip */ }
    }
  } catch { /* not found */ }
  return "";
}

async function hasPendingStories(cwd) {
  try {
    const raw = await readFile(join(cwd || process.cwd(), "prd.json"), "utf-8");
    const prd = JSON.parse(raw);
    return Array.isArray(prd.userStories) && prd.userStories.some((s) => s.passes === false);
  } catch { return false; }
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

  const input = {
    ...hookInput,
    last_assistant_text: lastText,
    has_pending_stories: pending,
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
