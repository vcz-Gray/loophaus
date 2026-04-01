import { describe, it, expect } from "vitest";
import { evaluatePolicy, DEFAULT_POLICY } from "../core/policy.js";

describe("evaluatePolicy", () => {
  it("passes with default policy under limit", () => {
    const result = evaluatePolicy(DEFAULT_POLICY, { currentIteration: 5 });
    expect(result.shouldStop).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it("stops when max_iterations exceeded", () => {
    const result = evaluatePolicy(DEFAULT_POLICY, { currentIteration: 21 });
    expect(result.shouldStop).toBe(true);
    expect(result.violations[0].type).toBe("max_iterations");
  });

  it("stops when max_cost exceeded", () => {
    const policy = { conditions: [{ type: "max_cost", value: 5.0 }] };
    const result = evaluatePolicy(policy, {}, { totalCost: 6.0 });
    expect(result.shouldStop).toBe(true);
  });

  it("stops when max_time exceeded", () => {
    const policy = { conditions: [{ type: "max_time_minutes", value: 30 }] };
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = evaluatePolicy(policy, { startedAt: past });
    expect(result.shouldStop).toBe(true);
  });

  it("handles multiple conditions", () => {
    const policy = { conditions: [
      { type: "max_iterations", value: 10 },
      { type: "max_cost", value: 5.0 },
    ]};
    const result = evaluatePolicy(policy, { currentIteration: 11 }, { totalCost: 6.0 });
    expect(result.shouldStop).toBe(true);
    expect(result.violations).toHaveLength(2);
  });
});
