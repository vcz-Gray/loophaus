// core/quality-scorer.ts
// Quality scoring for story implementations (autoresearch pattern: val_bpb -> quality score)

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import type { CommandError } from "../lib/runtime.js";
import { runCommand, runShellCommand } from "../lib/runtime.js";

interface CriterionConfig {
  weight: number;
  max: number;
}

const CRITERIA: Record<string, CriterionConfig> = {
  tests:     { weight: 3, max: 10 },
  typecheck: { weight: 2, max: 10 },
  lint:      { weight: 1, max: 10 },
  verify:    { weight: 2, max: 10 },
  diff:      { weight: 1, max: 10 },
  custom:    { weight: 1, max: 10 },
};

interface ScoreResult {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
}

type ResultValue = number | { score?: number } | undefined | null;

export function scoreStory(results: Record<string, ResultValue>): ScoreResult {
  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown: Record<string, number> = {};

  for (const [key, config] of Object.entries(CRITERIA)) {
    if (results[key] === undefined || results[key] === null) continue;
    const raw = results[key]!;
    const value = typeof raw === "number" ? raw : ((raw as { score?: number }).score ?? 0);
    const clamped = Math.max(0, Math.min(config.max, value));
    breakdown[key] = clamped;
    weightedSum += clamped * config.weight;
    totalWeight += config.max * config.weight;
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { score, grade, breakdown };
}

interface EvaluateConfig {
  testCommand?: string;
  typecheckCommand?: string;
  lintCommand?: string;
  verifyScript?: string;
}

interface EvaluationResult extends ScoreResult {
  storyId: string;
  results: Record<string, number>;
}

export async function evaluateStory(storyId: string, cwd: string, config: EvaluateConfig = {}): Promise<EvaluationResult> {
  const results: Record<string, number> = {};
  const splitLines = (value: string): string[] => value.split(/\r?\n/);

  if (config.testCommand) {
    try {
      await runShellCommand(config.testCommand, { cwd, timeout: 120_000 });
      results.tests = 10;
    } catch {
      results.tests = 0;
    }
  }

  if (config.typecheckCommand) {
    try {
      await runShellCommand(config.typecheckCommand, { cwd, timeout: 60_000 });
      results.typecheck = 10;
    } catch (err) {
      const output = (err as CommandError).stdout || (err as CommandError).stderr || "";
      const errorCount = splitLines(output).filter(line => line.includes("error")).length;
      results.typecheck = Math.max(0, 10 - errorCount);
    }
  }

  if (config.lintCommand) {
    try {
      await runShellCommand(config.lintCommand, { cwd, timeout: 60_000 });
      results.lint = 10;
    } catch (err) {
      const output = (err as CommandError).stdout || (err as CommandError).stderr || "";
      const warnings = splitLines(output).filter(line => line.includes("warning") || line.includes("error")).length;
      results.lint = Math.max(0, 10 - warnings);
    }
  }

  if (config.verifyScript) {
    try {
      await runShellCommand(config.verifyScript, { cwd, timeout: 60_000 });
      results.verify = 10;
    } catch {
      results.verify = 0;
    }
  }

  try {
    const { stdout } = await runCommand("git", ["diff", "--stat", "HEAD~1"], { cwd, timeout: 10_000 });
    const lines = stdout.trim().split(/\r?\n/);
    const lastLine = lines[lines.length - 1] || "";
    const match = lastLine.match(/(\d+) insertion.+?(\d+) deletion/);
    if (match) {
      const total = parseInt(match[1]) + parseInt(match[2]);
      results.diff = total < 100 ? 10 : total < 300 ? 8 : total < 500 ? 6 : total < 1000 ? 4 : 2;
    }
  } catch {
    // No git diff available
  }

  const customPath = join(cwd, ".loophaus", "quality.mjs");
  try {
    await stat(customPath);
    // Security: custom evaluators run with full Node.js permissions.
    // Only load from .loophaus/ (gitignored, user-controlled directory).
    const configPath = join(cwd, ".loophaus", "config.json");
    let customEnabled = true;
    try {
      const configRaw = await readFile(configPath, "utf-8");
      const config = JSON.parse(configRaw) as { customEvaluator?: boolean };
      if (config.customEvaluator === false) customEnabled = false;
    } catch { /* no config = enabled by default */ }

    if (customEnabled) {
      process.stderr.write(`loophaus: loading custom evaluator from ${customPath}\n`);
      const mod = await import(customPath) as { evaluate?: (storyId: string, cwd: string) => Promise<number | { score?: number }> };
      if (typeof mod.evaluate === "function") {
        const customResult = await mod.evaluate(storyId, cwd);
        results.custom = typeof customResult === "number" ? customResult : ((customResult as { score?: number })?.score ?? 0);
      }
    }
  } catch {
    // No custom evaluator
  }

  return { storyId, results, ...scoreStory(results) };
}

interface LogEntry {
  storyId: string;
  attempt: number;
  score: number;
  status: string;
  description: string;
  commit?: string;
}

export async function logResult(entry: LogEntry, cwd?: string): Promise<void> {
  const { appendFile, mkdir } = await import("node:fs/promises");
  const tsvPath = join(cwd || process.cwd(), ".loophaus", "results.tsv");
  await mkdir(join(cwd || process.cwd(), ".loophaus"), { recursive: true });

  try {
    await stat(tsvPath);
  } catch {
    await appendFile(tsvPath, "story_id\tattempt\tscore\tstatus\tdescription\tcommit\n", "utf-8");
  }

  const line = `${entry.storyId}\t${entry.attempt}\t${entry.score}\t${entry.status}\t${entry.description}\t${entry.commit || ""}\n`;
  await appendFile(tsvPath, line, "utf-8");
}

interface ResultEntry {
  storyId: string;
  attempt: number;
  score: number;
  status: string;
  description: string;
  commit: string;
}

export async function readResults(cwd?: string): Promise<ResultEntry[]> {
  const tsvPath = join(cwd || process.cwd(), ".loophaus", "results.tsv");
  try {
    const raw = await readFile(tsvPath, "utf-8");
    const lines = raw.trim().split(/\r?\n/).slice(1);
    return lines.map(line => {
      const [storyId, attempt, score, status, description, commit] = line.split("\t");
      return { storyId, attempt: parseInt(attempt), score: parseInt(score), status, description, commit };
    });
  } catch {
    return [];
  }
}
