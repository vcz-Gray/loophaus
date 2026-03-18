import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, rm, mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  processStopHook,
  extractPromise,
  getLastAssistantText,
} from "../lib/stop-hook-core.mjs";

let tempDir;
let savedState;

function makeReadState(state) {
  return async () => ({ ...state });
}

function makeWriteState() {
  return async (state) => {
    savedState = { ...state };
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ralph-hook-test-"));
  savedState = null;
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("extractPromise", () => {
  it("matches exact promise text", () => {
    expect(
      extractPromise("done <promise>COMPLETE</promise> end", "COMPLETE"),
    ).toBe(true);
  });

  it("matches with whitespace", () => {
    expect(extractPromise("<promise>  DONE  </promise>", "DONE")).toBe(true);
  });

  it("does not match wrong text", () => {
    expect(extractPromise("<promise>WRONG</promise>", "DONE")).toBe(false);
  });

  it("handles special regex chars in promise", () => {
    expect(
      extractPromise("<promise>test.* (ok)</promise>", "test.* (ok)"),
    ).toBe(true);
  });

  it("returns false when no tags present", () => {
    expect(extractPromise("just some text", "DONE")).toBe(false);
  });
});

describe("getLastAssistantText", () => {
  it("returns empty for null path", async () => {
    expect(await getLastAssistantText(null)).toBe("");
  });

  it("returns empty for nonexistent file", async () => {
    expect(await getLastAssistantText("/nonexistent/path")).toBe("");
  });

  it("extracts text from JSONL transcript", async () => {
    const transcript = join(tempDir, "transcript.jsonl");
    const lines = [
      JSON.stringify({
        role: "user",
        message: { content: [{ type: "text", text: "hello" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "text", text: "world" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: {
          content: [{ type: "text", text: "<promise>DONE</promise>" }],
        },
      }),
    ];
    await writeFile(transcript, lines.join("\n"), "utf-8");
    const result = await getLastAssistantText(transcript);
    expect(result).toBe("<promise>DONE</promise>");
  });

  it("handles string content format", async () => {
    const transcript = join(tempDir, "transcript2.jsonl");
    const lines = [
      JSON.stringify({ role: "assistant", content: "simple string" }),
    ];
    await writeFile(transcript, lines.join("\n"), "utf-8");
    const result = await getLastAssistantText(transcript);
    expect(result).toBe("simple string");
  });
});

describe("processStopHook", () => {
  it("allows exit when inactive", async () => {
    const state = {
      active: false,
      prompt: "",
      completionPromise: "",
      maxIterations: 0,
      currentIteration: 0,
      sessionId: "",
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("blocks exit and returns block decision when active", async () => {
    const state = {
      active: true,
      prompt: "Build API",
      completionPromise: "DONE",
      maxIterations: 10,
      currentIteration: 2,
      sessionId: "",
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("Build API");
    expect(output.reason).toContain("3/10");
    expect(output.systemMessage).toContain("DONE");
  });

  it("stops at max iterations", async () => {
    const state = {
      active: true,
      prompt: "test",
      completionPromise: "",
      maxIterations: 5,
      currentIteration: 5,
      sessionId: "",
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("max iterations");
    expect(savedState.active).toBe(false);
  });

  it("stops when completion promise detected in last_assistant_message", async () => {
    const state = {
      active: true,
      prompt: "test",
      completionPromise: "ALL_DONE",
      maxIterations: 20,
      currentIteration: 3,
      sessionId: "",
    };
    const hookInput = {
      last_assistant_message: "work complete <promise>ALL_DONE</promise>",
    };
    const result = await processStopHook(
      hookInput,
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("completion promise");
    expect(savedState.active).toBe(false);
  });

  it("stops when promise found in transcript file", async () => {
    const transcript = join(tempDir, "transcript.jsonl");
    await writeFile(
      transcript,
      JSON.stringify({
        role: "assistant",
        message: {
          content: [{ type: "text", text: "<promise>FINISHED</promise>" }],
        },
      }),
      "utf-8",
    );

    const state = {
      active: true,
      prompt: "test",
      completionPromise: "FINISHED",
      maxIterations: 20,
      currentIteration: 1,
      sessionId: "",
    };
    const hookInput = { transcript_path: transcript };
    const result = await processStopHook(
      hookInput,
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.stdout).toBe("");
    expect(savedState.active).toBe(false);
  });

  it("session isolation allows different session to exit", async () => {
    const state = {
      active: true,
      prompt: "test",
      completionPromise: "",
      maxIterations: 10,
      currentIteration: 0,
      sessionId: "session-A",
    };
    const hookInput = { session_id: "session-B" };
    const result = await processStopHook(
      hookInput,
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("no systemMessage about promise when completionPromise is empty", async () => {
    const state = {
      active: true,
      prompt: "test",
      completionPromise: "",
      maxIterations: 5,
      currentIteration: 0,
      sessionId: "",
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    const output = JSON.parse(result.stdout);
    expect(output.systemMessage).toContain("No completion promise");
  });

  it("advances to next phase from queue when promise detected", async () => {
    const state = {
      active: true,
      prompt: "Phase 1 task",
      completionPromise: "PHASE1_DONE",
      maxIterations: 20,
      currentIteration: 3,
      sessionId: "",
      queue: [
        {
          prompt: "Phase 2 task",
          completionPromise: "PHASE2_DONE",
          maxIterations: 15,
        },
        {
          prompt: "Phase 3 task",
          completionPromise: "TADA",
          maxIterations: 10,
        },
      ],
    };
    const hookInput = {
      last_assistant_message: "<promise>PHASE1_DONE</promise>",
    };
    const result = await processStopHook(
      hookInput,
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.stdout).not.toBe("");
    const output = JSON.parse(result.stdout);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("Phase 2 task");
    expect(result.stderr).toContain("advancing to next phase");
    expect(savedState.prompt).toBe("Phase 2 task");
    expect(savedState.completionPromise).toBe("PHASE2_DONE");
    expect(savedState.currentIteration).toBe(0);
    expect(savedState.queue).toHaveLength(1);
  });

  it("exits when promise detected and queue is empty", async () => {
    const state = {
      active: true,
      prompt: "Last phase",
      completionPromise: "TADA",
      maxIterations: 20,
      currentIteration: 5,
      sessionId: "",
      queue: [],
    };
    const hookInput = { last_assistant_message: "<promise>TADA</promise>" };
    const result = await processStopHook(
      hookInput,
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.stdout).toBe("");
    expect(savedState.active).toBe(false);
  });

  it("advances to next phase when max iterations reached with queue", async () => {
    const state = {
      active: true,
      prompt: "Phase 1",
      completionPromise: "P1",
      maxIterations: 5,
      currentIteration: 5,
      sessionId: "",
      queue: [
        { prompt: "Phase 2", completionPromise: "P2", maxIterations: 10 },
      ],
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    const output = JSON.parse(result.stdout);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("Phase 2");
    expect(savedState.currentIteration).toBe(0);
    expect(savedState.queue).toHaveLength(0);
  });

  it("stops when max iterations reached and queue is empty", async () => {
    const state = {
      active: true,
      prompt: "test",
      completionPromise: "",
      maxIterations: 5,
      currentIteration: 5,
      sessionId: "",
      queue: [],
    };
    const result = await processStopHook(
      {},
      makeReadState(state),
      makeWriteState(),
    );
    expect(result.stdout).toBe("");
    expect(savedState.active).toBe(false);
  });
});
