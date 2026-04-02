import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { evaluatePolicy, DEFAULT_POLICY, loadPolicy } from "../core/policy.js";

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

  it("stops when max_errors exceeded", () => {
    const policy = { conditions: [{ type: "max_errors", value: 3 }] };
    const result = evaluatePolicy(policy, { currentIteration: 1 }, { errorCount: 5 });
    expect(result.shouldStop).toBe(true);
    expect(result.violations[0].type).toBe("max_errors");
  });

  it("passes when max_errors not exceeded", () => {
    const policy = { conditions: [{ type: "max_errors", value: 10 }] };
    const result = evaluatePolicy(policy, { currentIteration: 1 }, { errorCount: 2 });
    expect(result.shouldStop).toBe(false);
  });

  it("passes when max_time_minutes without startedAt", () => {
    const policy = { conditions: [{ type: "max_time_minutes", value: 30 }] };
    const result = evaluatePolicy(policy, { currentIteration: 1 });
    expect(result.shouldStop).toBe(false);
  });

  it("passes when max_cost not exceeded", () => {
    const policy = { conditions: [{ type: "max_cost", value: 10 }] };
    const result = evaluatePolicy(policy, { currentIteration: 1 }, { totalCost: 5 });
    expect(result.shouldStop).toBe(false);
  });

  it("ignores unknown condition types", () => {
    const policy = { conditions: [{ type: "unknown_type", value: 1 }] };
    const result = evaluatePolicy(policy, { currentIteration: 1 });
    expect(result.shouldStop).toBe(false);
  });

  it("handles null/empty conditions array", () => {
    const result = evaluatePolicy({ conditions: [] }, { currentIteration: 100 });
    expect(result.shouldStop).toBe(false);
  });
});

describe("loadPolicy", () => {
  it("returns default policy when no file exists", async () => {
    const policy = await loadPolicy("/nonexistent");
    expect(policy.id).toBe("default");
    expect(policy.conditions).toHaveLength(1);
  });

  it("loads custom policy from file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "policy-test-"));
    await mkdir(join(dir, ".loophaus"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "policy.json"), JSON.stringify({
      id: "custom",
      conditions: [{ type: "max_cost", value: 2 }],
    }));
    const policy = await loadPolicy(dir);
    expect(policy.id).toBe("custom");
    expect(policy.conditions[0].type).toBe("max_cost");
    await rm(dir, { recursive: true });
  });
});
