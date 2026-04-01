import { describe, it, expect } from "vitest";
import { evaluateStopHook, extractPromise } from "../core/engine.mjs";

function makeState(overrides = {}) {
  return {
    active: true,
    prompt: "Do the task",
    completionPromise: "COMPLETE",
    maxIterations: 10,
    currentIteration: 0,
    sessionId: "",
    verifyScript: "",
    ...overrides,
  };
}

function makeInput(overrides = {}) {
  return {
    last_assistant_text: "",
    stop_hook_active: true,
    has_pending_stories: true,
    session_id: "",
    ...overrides,
  };
}

describe("extractPromise", () => {
  it("matches exact promise tag", () => {
    expect(extractPromise("<promise>COMPLETE</promise>", "COMPLETE")).toBe(true);
  });

  it("matches with surrounding text", () => {
    expect(extractPromise("Done! <promise>COMPLETE</promise> goodbye", "COMPLETE")).toBe(true);
  });

  it("matches with whitespace inside tags", () => {
    expect(extractPromise("<promise>  COMPLETE  </promise>", "COMPLETE")).toBe(true);
  });

  it("rejects when phrase is absent", () => {
    expect(extractPromise("no promise here", "COMPLETE")).toBe(false);
  });

  it("rejects partial match without tags", () => {
    expect(extractPromise("COMPLETE", "COMPLETE")).toBe(false);
  });

  it("escapes regex special characters in phrase", () => {
    expect(extractPromise("<promise>DONE (v2.0)</promise>", "DONE (v2.0)")).toBe(true);
  });
});

describe("evaluateStopHook", () => {
  it("allows exit when loop is inactive", () => {
    const state = makeState({ active: false });
    const result = evaluateStopHook(makeInput(), state);
    expect(result.decision).toBe("allow");
    expect(result.events).toEqual([]);
  });

  it("allows exit when session_id mismatches", () => {
    const state = makeState({ sessionId: "session-A" });
    const input = makeInput({ session_id: "session-B" });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("allow");
  });

  it("increments iteration on each call", () => {
    const state = makeState({ currentIteration: 2 });
    const result = evaluateStopHook(makeInput(), state);
    expect(result.nextState.currentIteration).toBe(3);
    expect(result.events[0]).toMatchObject({ event: "iteration", iteration: 3 });
  });

  it("stops at max iterations", () => {
    const state = makeState({ maxIterations: 5, currentIteration: 5 });
    const result = evaluateStopHook(makeInput(), state);
    expect(result.decision).toBe("allow");
    expect(result.nextState.active).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({ event: "stop", reason: "max_iterations" }));
    expect(result.message).toContain("max iterations");
  });

  it("stops on completion promise detection", () => {
    const state = makeState();
    const input = makeInput({ last_assistant_text: "All done <promise>COMPLETE</promise>" });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("allow");
    expect(result.nextState.active).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({ event: "stop", reason: "completion_promise" }));
  });

  it("continues when promise text present but not in tags", () => {
    const state = makeState();
    const input = makeInput({ last_assistant_text: "COMPLETE but not tagged" });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("block");
  });

  it("stops on policy violation", () => {
    const state = makeState();
    const input = makeInput({
      policy_result: {
        shouldStop: true,
        violations: [{ type: "max_cost", current: 1.5, limit: 1.0 }],
      },
    });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("allow");
    expect(result.nextState.active).toBe(false);
    expect(result.message).toContain("policy violation");
  });

  it("stops when verify script passes", () => {
    const state = makeState({ verifyScript: "npm test" });
    const input = makeInput({ verify_result: { passed: true } });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("allow");
    expect(result.nextState.active).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({ event: "stop", reason: "verify_script" }));
  });

  it("continues and logs when verify script fails", () => {
    const state = makeState({ verifyScript: "npm test" });
    const input = makeInput({ verify_result: { passed: false, output: "1 failed" } });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("block");
    expect(result.events).toContainEqual(expect.objectContaining({ event: "verify_failed" }));
  });

  it("stops when no pending stories remain", () => {
    const state = makeState({ completionPromise: "" });
    const input = makeInput({ stop_hook_active: true, has_pending_stories: false });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("allow");
    expect(result.nextState.active).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({ reason: "all_stories_done" }));
  });

  it("blocks and re-injects prompt when stories are pending", () => {
    const state = makeState();
    const input = makeInput({ stop_hook_active: true, has_pending_stories: true });
    const result = evaluateStopHook(input, state);
    expect(result.decision).toBe("block");
    expect(result.output.reason).toContain("Do the task");
    expect(result.output.systemMessage).toContain("Loop iteration");
  });

  it("tracks test results — all passed", () => {
    const state = makeState();
    const input = makeInput({
      test_results: [{ storyId: "US-001", passed: true }],
    });
    const result = evaluateStopHook(input, state);
    expect(result.events).toContainEqual(expect.objectContaining({ event: "test_result", status: "all_passed" }));
  });

  it("tracks test results — some failed", () => {
    const state = makeState();
    const input = makeInput({
      test_results: [
        { storyId: "US-001", passed: true },
        { storyId: "US-002", passed: false },
      ],
    });
    const result = evaluateStopHook(input, state);
    expect(result.events).toContainEqual(expect.objectContaining({ event: "test_result", status: "some_failed", failed: ["US-002"] }));
  });

  it("shows iteration without max when maxIterations is 0", () => {
    const state = makeState({ maxIterations: 0 });
    const input = makeInput();
    const result = evaluateStopHook(input, state);
    expect(result.output.systemMessage).toMatch(/Loop iteration 1 \|/);
    expect(result.output.systemMessage).not.toMatch(/\d+\/\d+/);
  });
});
