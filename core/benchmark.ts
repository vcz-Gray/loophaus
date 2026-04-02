// core/benchmark.ts
// Project-level quality measurement (autoresearch pattern: val_bpb → project score)

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, appendFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const execFileAsync = promisify(execFile);

export interface BenchmarkMetrics {
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
  testTimeMs: number;
  typecheckErrors: number;
  buildSuccess: boolean;
  coveragePct: number;
  pkgSizeKb: number;
}

export interface BenchmarkResult {
  score: number;
  grade: string;
  breakdown: Record<string, { value: number; max: number; score: number }>;
  metrics: BenchmarkMetrics;
}

export interface BenchmarkEntry {
  ts: string;
  commit: string;
  version: string;
  score: number;
  grade: string;
  testsPassed: number;
  testsTotal: number;
  testTimeMs: number;
  typecheckErrors: number;
  buildSuccess: boolean;
  coveragePct: number;
  pkgSizeKb: number;
}

export function scoreBenchmark(metrics: BenchmarkMetrics): BenchmarkResult {
  const breakdown: Record<string, { value: number; max: number; score: number }> = {};

  // Tests: 0-10 based on pass rate
  const testRate = metrics.testsTotal > 0 ? metrics.testsPassed / metrics.testsTotal : 0;
  breakdown.tests = { value: metrics.testsPassed, max: metrics.testsTotal, score: Math.round(testRate * 10) };

  // Typecheck: 10 if 0 errors, degrade
  const tcScore = metrics.typecheckErrors === 0 ? 10 : metrics.typecheckErrors <= 5 ? 6 : metrics.typecheckErrors <= 20 ? 3 : 0;
  breakdown.typecheck = { value: metrics.typecheckErrors, max: 0, score: tcScore };

  // Build: binary
  breakdown.build = { value: metrics.buildSuccess ? 1 : 0, max: 1, score: metrics.buildSuccess ? 10 : 0 };

  // Test time: < 2s = 10, < 5s = 8, < 10s = 6, < 30s = 4, else 2
  const ttScore = metrics.testTimeMs < 2000 ? 10 : metrics.testTimeMs < 5000 ? 8 : metrics.testTimeMs < 10000 ? 6 : metrics.testTimeMs < 30000 ? 4 : 2;
  breakdown.testTime = { value: metrics.testTimeMs, max: 2000, score: ttScore };

  // Coverage: direct percentage mapping to 0-10
  const covScore = Math.min(10, Math.round(metrics.coveragePct / 10));
  breakdown.coverage = { value: metrics.coveragePct, max: 100, score: covScore };

  // Package size: < 50KB = 10, < 100KB = 8, < 200KB = 6, < 500KB = 4, else 2
  const sizeScore = metrics.pkgSizeKb < 50 ? 10 : metrics.pkgSizeKb < 100 ? 8 : metrics.pkgSizeKb < 200 ? 6 : metrics.pkgSizeKb < 500 ? 4 : 2;
  breakdown.pkgSize = { value: metrics.pkgSizeKb, max: 50, score: sizeScore };

  // Weighted average (tests 3x, typecheck 2.5x, build 1.5x, coverage 2x, testTime 0.5x, pkgSize 0.5x)
  const weights = { tests: 3, typecheck: 2.5, build: 1.5, coverage: 2, testTime: 0.5, pkgSize: 0.5 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, w] of Object.entries(weights)) {
    weightedSum += breakdown[key].score * w;
    totalWeight += 10 * w;
  }

  const score = Math.round((weightedSum / totalWeight) * 100);
  const grade = score >= 90 ? "A+" : score >= 85 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { score, grade, breakdown, metrics };
}

export async function runBenchmark(cwd?: string): Promise<BenchmarkResult> {
  const dir = cwd || process.cwd();
  const metrics: BenchmarkMetrics = {
    testsPassed: 0,
    testsFailed: 0,
    testsTotal: 0,
    testTimeMs: 0,
    typecheckErrors: 0,
    buildSuccess: false,
    coveragePct: 0,
    pkgSizeKb: 0,
  };

  // 1. Tests
  const testStart = Date.now();
  try {
    const { stdout } = await execFileAsync("npx", ["vitest", "run", "--reporter=json"], { cwd: dir, timeout: 120_000 });
    metrics.testTimeMs = Date.now() - testStart;
    try {
      const json = JSON.parse(stdout);
      metrics.testsPassed = json.numPassedTests ?? 0;
      metrics.testsFailed = json.numFailedTests ?? 0;
      metrics.testsTotal = json.numTotalTests ?? 0;
    } catch {
      // JSON parse failed, try regex fallback
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      if (passMatch) metrics.testsPassed = parseInt(passMatch[1]);
      if (failMatch) metrics.testsFailed = parseInt(failMatch[1]);
      metrics.testsTotal = metrics.testsPassed + metrics.testsFailed;
    }
  } catch (err) {
    metrics.testTimeMs = Date.now() - testStart;
    const output = (err as { stdout?: string }).stdout || "";
    const passMatch = output.match(/(\d+) passed/);
    if (passMatch) metrics.testsPassed = parseInt(passMatch[1]);
    const failMatch = output.match(/(\d+) failed/);
    if (failMatch) metrics.testsFailed = parseInt(failMatch[1]);
    metrics.testsTotal = metrics.testsPassed + metrics.testsFailed;
  }

  // 2. Typecheck
  try {
    await execFileAsync("npx", ["tsc", "--noEmit"], { cwd: dir, timeout: 60_000 });
    metrics.typecheckErrors = 0;
  } catch (err) {
    const output = (err as { stdout?: string }).stdout || (err as { stderr?: string }).stderr || "";
    const errorCount = (output.match(/error TS/g) || []).length;
    metrics.typecheckErrors = errorCount || 1;
  }

  // 3. Build
  try {
    await execFileAsync("npm", ["run", "build"], { cwd: dir, timeout: 60_000 });
    metrics.buildSuccess = true;
  } catch {
    metrics.buildSuccess = false;
  }

  // 4. Coverage
  try {
    const summaryPath = join(dir, "coverage", "coverage-summary.json");
    const raw = await readFile(summaryPath, "utf-8");
    const summary = JSON.parse(raw) as { total?: { lines?: { pct?: number } } };
    metrics.coveragePct = summary.total?.lines?.pct ?? 0;
  } catch {
    // Run coverage if summary doesn't exist
    try {
      await execFileAsync("npx", ["vitest", "run", "--coverage"], { cwd: dir, timeout: 120_000 });
      const summaryPath = join(dir, "coverage", "coverage-summary.json");
      const raw = await readFile(summaryPath, "utf-8");
      const summary = JSON.parse(raw) as { total?: { lines?: { pct?: number } } };
      metrics.coveragePct = summary.total?.lines?.pct ?? 0;
    } catch {
      metrics.coveragePct = 0;
    }
  }

  // 5. Package size
  try {
    const distDir = join(dir, "dist");
    const s = await stat(distDir);
    if (s.isDirectory()) {
      const { stdout } = await execFileAsync("du", ["-sk", distDir], { timeout: 10_000 });
      const match = stdout.match(/^(\d+)/);
      metrics.pkgSizeKb = match ? parseInt(match[1]) : 0;
    }
  } catch {
    metrics.pkgSizeKb = 0;
  }

  return scoreBenchmark(metrics);
}

function getBenchmarkPath(cwd?: string): string {
  return join(cwd || process.cwd(), ".loophaus", "benchmark.tsv");
}

const HEADER = "ts\tcommit\tversion\tscore\tgrade\ttests_passed\ttests_total\ttest_time_ms\ttypecheck_errors\tbuild_ok\tcoverage_pct\tpkg_size_kb\n";

export async function logBenchmark(result: BenchmarkResult, cwd?: string): Promise<void> {
  const benchPath = getBenchmarkPath(cwd);
  await mkdir(dirname(benchPath), { recursive: true });

  let commitHash = "unknown";
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { timeout: 5_000 });
    commitHash = stdout.trim();
  } catch { /* not in git */ }

  let version = "unknown";
  try {
    const pkgPath = join(cwd || process.cwd(), "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as { version?: string };
    version = pkg.version || "unknown";
  } catch { /* no package.json */ }

  // Write header if file is new
  try {
    await stat(benchPath);
  } catch {
    await appendFile(benchPath, HEADER, "utf-8");
  }

  const m = result.metrics;
  const line = [
    new Date().toISOString(),
    commitHash,
    version,
    result.score,
    result.grade,
    m.testsPassed,
    m.testsTotal,
    m.testTimeMs,
    m.typecheckErrors,
    m.buildSuccess ? 1 : 0,
    m.coveragePct.toFixed(1),
    m.pkgSizeKb,
  ].join("\t") + "\n";

  await appendFile(benchPath, line, "utf-8");
}

export async function readBenchmarkHistory(cwd?: string): Promise<BenchmarkEntry[]> {
  const benchPath = getBenchmarkPath(cwd);
  try {
    const raw = await readFile(benchPath, "utf-8");
    const lines = raw.trim().split("\n").slice(1); // skip header
    return lines.map(line => {
      const cols = line.split("\t");
      return {
        ts: cols[0] || "",
        commit: cols[1] || "",
        version: cols[2] || "",
        score: parseInt(cols[3]) || 0,
        grade: cols[4] || "",
        testsPassed: parseInt(cols[5]) || 0,
        testsTotal: parseInt(cols[6]) || 0,
        testTimeMs: parseInt(cols[7]) || 0,
        typecheckErrors: parseInt(cols[8]) || 0,
        buildSuccess: cols[9] === "1",
        coveragePct: parseFloat(cols[10]) || 0,
        pkgSizeKb: parseInt(cols[11]) || 0,
      };
    });
  } catch {
    return [];
  }
}
