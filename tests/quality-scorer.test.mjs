import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scoreStory, readResults, logResult } from "../core/quality-scorer.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("scoreStory", () => {
  it("scores perfect results", () => {
    const result = scoreStory({ tests: 10, typecheck: 10, lint: 10, verify: 10, diff: 10 });
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
  });

  it("scores partial results", () => {
    const result = scoreStory({ tests: 5, typecheck: 10 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("scores zero results", () => {
    const result = scoreStory({ tests: 0, typecheck: 0 });
    expect(result.score).toBe(0);
    expect(result.grade).toBe("F");
  });

  it("handles empty results", () => {
    const result = scoreStory({});
    expect(result.score).toBe(0);
  });

  it("assigns correct grades", () => {
    expect(scoreStory({ tests: 10, typecheck: 10, lint: 10, verify: 10, diff: 10 }).grade).toBe("A");
    expect(scoreStory({ tests: 8 }).grade).toBe("B");
    expect(scoreStory({ tests: 7 }).grade).toBe("C");
    expect(scoreStory({ tests: 6 }).grade).toBe("D");
    expect(scoreStory({ tests: 3 }).grade).toBe("F");
  });

  it("clamps values to 0-10", () => {
    const result = scoreStory({ tests: 15, typecheck: -5 });
    expect(result.breakdown.tests).toBe(10);
    expect(result.breakdown.typecheck).toBe(0);
  });
});

describe("logResult + readResults", () => {
  let tempDir;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), "loophaus-quality-")); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it("writes and reads results.tsv", async () => {
    await logResult({ storyId: "US-001", attempt: 1, score: 65, status: "discard", description: "first try" }, tempDir);
    await logResult({ storyId: "US-001", attempt: 2, score: 82, status: "keep", description: "improved" }, tempDir);
    const results = await readResults(tempDir);
    expect(results).toHaveLength(2);
    expect(results[0].storyId).toBe("US-001");
    expect(results[1].score).toBe(82);
  });
});
