import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scoreBenchmark, readBenchmarkHistory, logBenchmark } from "../core/benchmark.js";

describe("scoreBenchmark", () => {
  it("scores perfect metrics as A+", () => {
    const result = scoreBenchmark({
      testsPassed: 300, testsFailed: 0, testsTotal: 300,
      testTimeMs: 1000, typecheckErrors: 0, buildSuccess: true,
      coveragePct: 95, pkgSizeKb: 30,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A+");
  });

  it("scores zero metrics as F", () => {
    const result = scoreBenchmark({
      testsPassed: 0, testsFailed: 10, testsTotal: 10,
      testTimeMs: 60000, typecheckErrors: 100, buildSuccess: false,
      coveragePct: 0, pkgSizeKb: 1000,
    });
    expect(result.score).toBeLessThan(60);
    expect(result.grade).toBe("F");
  });

  it("weights tests more than pkg size", () => {
    const goodTests = scoreBenchmark({
      testsPassed: 100, testsFailed: 0, testsTotal: 100,
      testTimeMs: 5000, typecheckErrors: 5, buildSuccess: true,
      coveragePct: 50, pkgSizeKb: 500,
    });
    const goodSize = scoreBenchmark({
      testsPassed: 50, testsFailed: 50, testsTotal: 100,
      testTimeMs: 5000, typecheckErrors: 5, buildSuccess: true,
      coveragePct: 50, pkgSizeKb: 10,
    });
    expect(goodTests.score).toBeGreaterThan(goodSize.score);
  });

  it("handles zero total tests", () => {
    const result = scoreBenchmark({
      testsPassed: 0, testsFailed: 0, testsTotal: 0,
      testTimeMs: 0, typecheckErrors: 0, buildSuccess: true,
      coveragePct: 0, pkgSizeKb: 0,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("produces breakdown with all 6 metrics", () => {
    const result = scoreBenchmark({
      testsPassed: 10, testsFailed: 0, testsTotal: 10,
      testTimeMs: 1000, typecheckErrors: 0, buildSuccess: true,
      coveragePct: 80, pkgSizeKb: 40,
    });
    expect(Object.keys(result.breakdown)).toEqual(
      expect.arrayContaining(["tests", "typecheck", "build", "testTime", "coverage", "pkgSize"])
    );
  });

  it("typecheck degrades with more errors", () => {
    const zero = scoreBenchmark({ testsPassed: 1, testsFailed: 0, testsTotal: 1, testTimeMs: 100, typecheckErrors: 0, buildSuccess: true, coveragePct: 0, pkgSizeKb: 0 });
    const some = scoreBenchmark({ testsPassed: 1, testsFailed: 0, testsTotal: 1, testTimeMs: 100, typecheckErrors: 10, buildSuccess: true, coveragePct: 0, pkgSizeKb: 0 });
    const many = scoreBenchmark({ testsPassed: 1, testsFailed: 0, testsTotal: 1, testTimeMs: 100, typecheckErrors: 50, buildSuccess: true, coveragePct: 0, pkgSizeKb: 0 });
    expect(zero.breakdown.typecheck.score).toBeGreaterThan(some.breakdown.typecheck.score);
    expect(some.breakdown.typecheck.score).toBeGreaterThan(many.breakdown.typecheck.score);
  });
});

describe("logBenchmark + readBenchmarkHistory roundtrip", () => {
  it("writes and reads benchmark entries", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bench-test-"));
    const result = scoreBenchmark({
      testsPassed: 100, testsFailed: 0, testsTotal: 100,
      testTimeMs: 1500, typecheckErrors: 0, buildSuccess: true,
      coveragePct: 80, pkgSizeKb: 45,
    });

    await logBenchmark(result, dir);
    await logBenchmark(result, dir);

    const history = await readBenchmarkHistory(dir);
    expect(history).toHaveLength(2);
    expect(history[0].score).toBe(result.score);
    expect(history[0].grade).toBe(result.grade);
    expect(history[0].testsPassed).toBe(100);
    expect(history[0].coveragePct).toBe(80);
    await rm(dir, { recursive: true });
  });

  it("returns empty array when no history exists", async () => {
    const history = await readBenchmarkHistory("/nonexistent");
    expect(history).toEqual([]);
  });
});
