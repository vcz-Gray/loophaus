// core/quality-scorer.mjs
// Quality scoring for story implementations (autoresearch pattern: val_bpb -> quality score)

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const CRITERIA = {
  tests:     { weight: 3, max: 10 },
  typecheck: { weight: 2, max: 10 },
  lint:      { weight: 1, max: 10 },
  verify:    { weight: 2, max: 10 },
  diff:      { weight: 1, max: 10 },
  custom:    { weight: 1, max: 10 },
};

export function scoreStory(results) {
  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown = {};

  for (const [key, config] of Object.entries(CRITERIA)) {
    if (results[key] === undefined || results[key] === null) continue;
    const value = typeof results[key] === "number" ? results[key] : (results[key].score ?? 0);
    const clamped = Math.max(0, Math.min(config.max, value));
    breakdown[key] = clamped;
    weightedSum += clamped * config.weight;
    totalWeight += config.max * config.weight;
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { score, grade, breakdown };
}

export async function evaluateStory(storyId, cwd, config = {}) {
  const results = {};

  if (config.testCommand) {
    try {
      await execFileAsync("sh", ["-c", config.testCommand], { cwd, timeout: 120_000 });
      results.tests = 10;
    } catch {
      results.tests = 0;
    }
  }

  if (config.typecheckCommand) {
    try {
      await execFileAsync("sh", ["-c", config.typecheckCommand], { cwd, timeout: 60_000 });
      results.typecheck = 10;
    } catch (err) {
      const errorCount = (err.stdout || "").split("\n").filter(l => l.includes("error")).length;
      results.typecheck = Math.max(0, 10 - errorCount);
    }
  }

  if (config.lintCommand) {
    try {
      await execFileAsync("sh", ["-c", config.lintCommand], { cwd, timeout: 60_000 });
      results.lint = 10;
    } catch (err) {
      const warnings = (err.stdout || "").split("\n").filter(l => l.includes("warning") || l.includes("error")).length;
      results.lint = Math.max(0, 10 - warnings);
    }
  }

  if (config.verifyScript) {
    try {
      await execFileAsync("sh", ["-c", config.verifyScript], { cwd, timeout: 60_000 });
      results.verify = 10;
    } catch {
      results.verify = 0;
    }
  }

  try {
    const { stdout } = await execFileAsync("git", ["diff", "--stat", "HEAD~1"], { cwd, timeout: 10_000 });
    const lines = stdout.trim().split("\n");
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
    const mod = await import(customPath);
    if (typeof mod.evaluate === "function") {
      const customResult = await mod.evaluate(storyId, cwd);
      results.custom = typeof customResult === "number" ? customResult : (customResult?.score ?? 0);
    }
  } catch {
    // No custom evaluator
  }

  return { storyId, results, ...scoreStory(results) };
}

export async function logResult(entry, cwd) {
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

export async function readResults(cwd) {
  const tsvPath = join(cwd || process.cwd(), ".loophaus", "results.tsv");
  try {
    const raw = await readFile(tsvPath, "utf-8");
    const lines = raw.trim().split("\n").slice(1);
    return lines.map(line => {
      const [storyId, attempt, score, status, description, commit] = line.split("\t");
      return { storyId, attempt: parseInt(attempt), score: parseInt(score), status, description, commit };
    });
  } catch {
    return [];
  }
}
