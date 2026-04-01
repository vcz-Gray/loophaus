import { describe, it, expect } from "vitest";
import { validateState, validateLoopConfig } from "../core/validate.mjs";

describe("validateState", () => {
  it("accepts valid state", () => {
    const result = validateState({
      active: true, prompt: "test", maxIterations: 20, currentIteration: 0
    });
    expect(result.valid).toBe(true);
  });

  it("rejects non-object", () => {
    expect(validateState(null).valid).toBe(false);
    expect(validateState("string").valid).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = validateState({ active: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects wrong types", () => {
    const result = validateState({
      active: "yes", prompt: 123, maxIterations: "20", currentIteration: "0"
    });
    expect(result.valid).toBe(false);
  });

  it("rejects negative maxIterations", () => {
    const result = validateState({
      active: false, prompt: "", maxIterations: -1, currentIteration: 0
    });
    expect(result.valid).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = validateState({
      active: true, prompt: "test", maxIterations: 20, currentIteration: 0,
      name: "my-loop", verifyScript: "./verify.sh", startedAt: "2026-03-30T00:00:00Z"
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateLoopConfig", () => {
  it("accepts valid config", () => {
    expect(validateLoopConfig({ protocol_version: "1.0" }).valid).toBe(true);
  });

  it("rejects unsupported version", () => {
    expect(validateLoopConfig({ protocol_version: "2.0" }).valid).toBe(false);
  });
});
