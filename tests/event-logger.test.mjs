import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getTracePath, logEvents, readTrace } from "../core/event-logger.mjs";

describe("getTracePath", () => {
  it("returns .loophaus/trace.jsonl under given cwd", () => {
    expect(getTracePath("/foo/bar")).toBe(join("/foo/bar", ".loophaus", "trace.jsonl"));
  });
});

describe("logEvents + readTrace roundtrip", () => {
  it("writes and reads events", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trace-test-"));
    await logEvents([{ event: "iteration", iteration: 1 }], { session: "s1" }, dir);
    await logEvents([{ event: "stop", reason: "done" }], { session: "s1" }, dir);

    const trace = await readTrace(dir);
    expect(trace).toHaveLength(2);
    expect(trace[0]).toMatchObject({ event: "iteration", iteration: 1, session: "s1" });
    expect(trace[1]).toMatchObject({ event: "stop", reason: "done" });
    expect(trace[0].ts).toBeDefined();
    await rm(dir, { recursive: true });
  });

  it("returns empty array for non-existent trace", async () => {
    const trace = await readTrace("/nonexistent");
    expect(trace).toEqual([]);
  });

  it("skips malformed JSON lines", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trace-test-"));
    await logEvents([{ event: "a" }], {}, dir);
    // Manually corrupt one line
    const { appendFile } = await import("node:fs/promises");
    await appendFile(join(dir, ".loophaus", "trace.jsonl"), "NOT JSON\n", "utf-8");
    await logEvents([{ event: "b" }], {}, dir);

    const trace = await readTrace(dir);
    expect(trace).toHaveLength(2);
    expect(trace[0].event).toBe("a");
    expect(trace[1].event).toBe("b");
    await rm(dir, { recursive: true });
  });
});
