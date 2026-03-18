import { readFile } from "node:fs/promises";

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
      `Ralph loop: max iterations (${state.maxIterations}) reached.\n`,
    );

    // On max iterations, also check queue for next phase
    const queue = Array.isArray(state.queue) ? state.queue : [];
    if (queue.length > 0) {
      const next = queue.shift();
      state.prompt = next.prompt;
      state.completionPromise = next.completionPromise || "TADA";
      state.maxIterations = next.maxIterations || 20;
      state.currentIteration = 0;
      state.queue = queue;
      await writeStateFn(state);

      stderr.push(
        `Ralph loop: advancing to next phase (${queue.length} remaining).\n`,
      );
      const reason = [
        state.prompt,
        "",
        "---",
        `Ralph Loop — new phase started (iteration 1/${state.maxIterations}). Previous phase hit max iterations. Work on the task above.`,
      ].join("\n");
      const output = { decision: "block", reason };
      if (state.completionPromise) {
        output.systemMessage = `Ralph phase started (${queue.length} more queued) | To complete: output <promise>${state.completionPromise}</promise>`;
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify(output),
        stderr: stderr.join(""),
      };
    }

    state.active = false;
    state.queue = [];
    await writeStateFn(state);
    return { exitCode: 0, stdout: "", stderr: stderr.join("") };
  }

  // Check completion promise
  if (state.completionPromise) {
    const transcriptPath = hookInput.transcript_path || null;
    const lastText =
      hookInput.last_assistant_message ||
      (await getLastAssistantText(transcriptPath));

    if (lastText && extractPromise(lastText, state.completionPromise)) {
      stderr.push(
        `Ralph loop: completion promise "${state.completionPromise}" detected.\n`,
      );

      // Check queue for next phase
      const queue = Array.isArray(state.queue) ? state.queue : [];
      if (queue.length > 0) {
        const next = queue.shift();
        state.prompt = next.prompt;
        state.completionPromise = next.completionPromise || "TADA";
        state.maxIterations = next.maxIterations || 20;
        state.currentIteration = 0;
        state.queue = queue;
        await writeStateFn(state);

        const phasesLeft = queue.length;
        stderr.push(
          `Ralph loop: advancing to next phase (${phasesLeft} remaining in queue).\n`,
        );

        const nextIterInfo =
          state.maxIterations > 0 ? `1/${state.maxIterations}` : "1";
        const reason = [
          state.prompt,
          "",
          "---",
          `Ralph Loop — new phase started (iteration ${nextIterInfo}). Work on the task above.`,
        ].join("\n");

        const output = { decision: "block", reason };
        if (state.completionPromise) {
          output.systemMessage = `Ralph phase started (${phasesLeft} more queued) | To complete: output <promise>${state.completionPromise}</promise> (ONLY when TRUE)`;
        }
        return {
          exitCode: 0,
          stdout: JSON.stringify(output),
          stderr: stderr.join(""),
        };
      }

      state.active = false;
      state.queue = [];
      await writeStateFn(state);
      return { exitCode: 0, stdout: "", stderr: stderr.join("") };
    }
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
    `Ralph Loop iteration ${iterInfo}. Continue working on the task above.`,
  ].join("\n");

  const output = { decision: "block", reason };

  if (state.completionPromise) {
    output.systemMessage = `Ralph iteration ${iterInfo} | To stop: output <promise>${state.completionPromise}</promise> (ONLY when TRUE)`;
  } else {
    output.systemMessage = `Ralph iteration ${iterInfo} | No completion promise — loop runs until max iterations`;
  }

  return {
    exitCode: 0,
    stdout: JSON.stringify(output),
    stderr: stderr.join(""),
  };
}
