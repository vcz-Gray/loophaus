import { describe, it, expect } from "vitest";
import { analyzeTrace, compareTraces, replayTrace } from "../core/trace-analyzer.js";

describe("analyzeTrace", () => {
  const events = [
    { event: "iteration", iteration: 1, ts: "2026-01-01T00:00:00Z" },
    { event: "story_complete", story: "US-001", ts: "2026-01-01T00:01:00Z" },
    { event: "iteration", iteration: 2, ts: "2026-01-01T00:02:00Z" },
    { event: "stop", reason: "completion_promise", ts: "2026-01-01T00:03:00Z" },
  ];

  it("analyzes correctly", () => {
    const result = analyzeTrace(events);
    expect(result.iterations).toBe(2);
    expect(result.stops).toBe(1);
    expect(result.storiesCompleted).toBe(1);
    expect(result.lastStopReason).toBe("completion_promise");
    expect(result.durationMs).toBe(180000);
  });

  it("handles empty trace", () => {
    const result = analyzeTrace([]);
    expect(result.iterations).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("compareTraces", () => {
  it("computes diff", () => {
    const t1 = [
      { event: "iteration", ts: "2026-01-01T00:00:00Z" },
      { event: "stop", reason: "max_iterations", ts: "2026-01-01T00:01:00Z" },
    ];
    const t2 = [
      { event: "iteration", ts: "2026-01-01T00:00:00Z" },
      { event: "iteration", ts: "2026-01-01T00:02:00Z" },
      { event: "stop", reason: "completion_promise", ts: "2026-01-01T00:03:00Z" },
    ];
    const result = compareTraces(t1, t2);
    expect(result.diff.iterations).toBe(1);
  });
});

describe("replayTrace", () => {
  it("computes relative timing", () => {
    const events = [
      { event: "iteration", ts: "2026-01-01T00:00:00Z" },
      { event: "stop", ts: "2026-01-01T00:01:00Z" },
    ];
    const replayed = replayTrace(events, 2);
    expect(replayed[0].relativeMs).toBe(0);
    expect(replayed[1].relativeMs).toBe(30000);
  });
});
