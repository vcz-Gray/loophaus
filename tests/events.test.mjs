import { describe, it, expect } from "vitest";
import { EventType, filterByType, filterByTimeRange, summarizeEvents } from "../core/events.js";

describe("EventType", () => {
  it("has expected types", () => {
    expect(EventType.ITERATION).toBe("iteration");
    expect(EventType.STOP).toBe("stop");
    expect(EventType.COST).toBe("cost");
  });
});

describe("filterByType", () => {
  const events = [
    { event: "iteration", ts: "2026-01-01T00:00:00Z" },
    { event: "stop", ts: "2026-01-01T00:01:00Z" },
    { event: "iteration", ts: "2026-01-01T00:02:00Z" },
  ];

  it("filters correctly", () => {
    expect(filterByType(events, "iteration")).toHaveLength(2);
    expect(filterByType(events, "stop")).toHaveLength(1);
    expect(filterByType(events, "error")).toHaveLength(0);
  });
});

describe("summarizeEvents", () => {
  it("counts and computes duration", () => {
    const events = [
      { event: "iteration", ts: "2026-01-01T00:00:00Z" },
      { event: "iteration", ts: "2026-01-01T00:01:00Z" },
      { event: "stop", ts: "2026-01-01T00:02:00Z" },
    ];
    const summary = summarizeEvents(events);
    expect(summary.total).toBe(3);
    expect(summary.counts.iteration).toBe(2);
    expect(summary.counts.stop).toBe(1);
    expect(summary.durationMs).toBe(120000);
  });
});
