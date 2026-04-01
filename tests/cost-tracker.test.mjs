import { describe, it, expect } from "vitest";
import { estimateCost, formatCost, createTracker, MODEL_PRICES } from "../core/cost-tracker.mjs";

describe("estimateCost", () => {
  it("calculates claude-sonnet-4 cost", () => {
    const cost = estimateCost("claude-sonnet-4", 1_000_000, 1_000_000);
    expect(cost.inputCost).toBe(3);
    expect(cost.outputCost).toBe(15);
    expect(cost.totalCost).toBe(18);
  });

  it("uses default for unknown model", () => {
    const cost = estimateCost("unknown-model", 1000, 1000);
    expect(cost.totalCost).toBeGreaterThan(0);
  });
});

describe("formatCost", () => {
  it("formats small costs in cents", () => {
    expect(formatCost(0.005)).toContain("\u00a2");
  });

  it("formats larger costs in dollars", () => {
    expect(formatCost(1.5)).toBe("$1.5000");
  });
});

describe("createTracker", () => {
  it("records and summarizes", () => {
    const tracker = createTracker();
    tracker.record("iter-1", "claude-sonnet-4", 10000, 5000);
    tracker.record("iter-2", "claude-sonnet-4", 10000, 5000);
    const summary = tracker.summary();
    expect(summary.records).toBe(2);
    expect(summary.totalInput).toBe(20000);
    expect(summary.totalOutput).toBe(10000);
    expect(summary.totalCost).toBeGreaterThan(0);
  });
});
