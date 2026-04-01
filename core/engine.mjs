// Pure function: no I/O, no side effects. Returns decision + next state + events.

export function evaluateStopHook(input, state) {
  const events = [];
  const nextState = { ...state };

  if (!nextState.active) {
    return { decision: "allow", nextState, events, output: null };
  }

  if (nextState.sessionId && input.session_id && nextState.sessionId !== input.session_id) {
    return { decision: "allow", nextState, events, output: null };
  }

  nextState.currentIteration += 1;
  events.push({ event: "iteration", iteration: nextState.currentIteration });

  if (nextState.maxIterations > 0 && nextState.currentIteration > nextState.maxIterations) {
    nextState.active = false;
    events.push({ event: "stop", reason: "max_iterations" });
    return {
      decision: "allow",
      nextState,
      events,
      output: null,
      message: `Loop: max iterations (${nextState.maxIterations}) reached.`,
    };
  }

  if (nextState.completionPromise && input.last_assistant_text) {
    if (extractPromise(input.last_assistant_text, nextState.completionPromise)) {
      nextState.active = false;
      events.push({ event: "stop", reason: "completion_promise", promise: nextState.completionPromise });
      return {
        decision: "allow",
        nextState,
        events,
        output: null,
        message: `Loop: completion promise "${nextState.completionPromise}" detected.`,
      };
    }
  }

  // Check verify script result (pre-computed by caller)
  if (nextState.verifyScript && input.verify_result) {
    if (input.verify_result.passed) {
      nextState.active = false;
      events.push({ event: "stop", reason: "verify_script", script: nextState.verifyScript });
      return {
        decision: "allow",
        nextState,
        events,
        output: null,
        message: `Loop: verify script passed.`,
      };
    }
    events.push({ event: "verify_failed", script: nextState.verifyScript, output: input.verify_result.output || "" });
  }

  if (input.stop_hook_active === true) {
    if (!input.has_pending_stories) {
      nextState.active = false;
      events.push({ event: "stop", reason: "all_stories_done" });
      return {
        decision: "allow",
        nextState,
        events,
        output: null,
        message: "Loop: no pending stories. Allowing exit.",
      };
    }
    events.push({ event: "continue", reason: "pending_stories" });
  }

  events.push({ event: "state_change", from: "running", to: "running" });

  const iterInfo = nextState.maxIterations > 0
    ? `${nextState.currentIteration}/${nextState.maxIterations}`
    : `${nextState.currentIteration}`;

  const reason = [nextState.prompt, "", "---", `Loop iteration ${iterInfo}. Continue working on the task above.`].join("\n");

  const output = { decision: "block", reason };
  if (nextState.completionPromise) {
    output.systemMessage = `Loop iteration ${iterInfo} | To stop: output <promise>${nextState.completionPromise}</promise> (ONLY when TRUE)`;
  } else {
    output.systemMessage = `Loop iteration ${iterInfo} | No completion promise — loop runs until max iterations`;
  }

  return { decision: "block", nextState, events, output };
}

export function extractPromise(text, promisePhrase) {
  const regex = new RegExp(`<promise>\\s*${escapeRegex(promisePhrase)}\\s*</promise>`, "s");
  return regex.test(text);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
