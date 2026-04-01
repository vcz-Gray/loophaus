import { describe, it, expect } from "vitest";
import { shouldKeep, generateFeedback, identifyRefinementTargets } from "../core/refine-loop.js";

describe("shouldKeep", () => {
  it("keeps when improved", () => {
    expect(shouldKeep(80, 65)).toBe(true);
  });
  it("discards when same", () => {
    expect(shouldKeep(65, 65)).toBe(false);
  });
  it("discards when worse", () => {
    expect(shouldKeep(50, 65)).toBe(false);
  });
});

describe("generateFeedback", () => {
  it("includes weak areas", () => {
    const feedback = generateFeedback({ storyId: "US-001", score: 65, grade: "D", breakdown: { tests: 3, typecheck: 10 } });
    expect(feedback).toContain("tests: 3/10");
    expect(feedback).not.toContain("typecheck");
  });

  it("includes previous attempts", () => {
    const feedback = generateFeedback(
      { storyId: "US-001", score: 65, grade: "D", breakdown: {} },
      [{ attempt: 1, score: 50, status: "discard" }]
    );
    expect(feedback).toContain("attempt 1: 50");
  });
});

describe("identifyRefinementTargets", () => {
  it("finds stories below threshold", () => {
    const evals = [
      { storyId: "US-001", score: 92 },
      { storyId: "US-002", score: 65 },
      { storyId: "US-003", score: 45 },
    ];
    const targets = identifyRefinementTargets(evals, 80);
    expect(targets).toHaveLength(2);
    expect(targets[0].storyId).toBe("US-003");
  });

  it("returns empty when all pass", () => {
    const evals = [{ storyId: "US-001", score: 90 }];
    expect(identifyRefinementTargets(evals, 80)).toHaveLength(0);
  });
});
