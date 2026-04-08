import type { CliContext } from "../cli-utils.js";
import { spinner } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { runBenchmark, logBenchmark, readBenchmarkHistory } = await import("../../core/benchmark.js");

  const s = spinner("Running benchmark...");
  let result;
  try {
    result = await runBenchmark();
  } finally {
    s.stop();
  }

  await logBenchmark(result);

  console.log("Project Benchmark");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
  console.log(`  Score: ${result.score}/100 (${result.grade})\n`);

  const labels: Record<string, string> = {
    tests: "Tests",
    typecheck: "Typecheck",
    build: "Build",
    testTime: "Test Time",
    coverage: "Coverage",
    pkgSize: "Pkg Size",
  };

  for (const [key, info] of Object.entries(result.breakdown)) {
    const bar = "\u2588".repeat(info.score) + "\u2591".repeat(10 - info.score);
    const label = (labels[key] || key).padEnd(12);
    console.log(`  ${label} ${bar} ${info.score}/10`);
  }

  // Trend
  const history = await readBenchmarkHistory();
  if (history.length > 1) {
    const prev = history[history.length - 2];
    const diff = result.score - prev.score;
    const arrow = diff > 0 ? `\x1b[32m+${diff}\x1b[0m` : diff < 0 ? `\x1b[31m${diff}\x1b[0m` : "0";
    console.log(`\n  Trend: ${prev.score} → ${result.score} (${arrow})`);
    console.log(`  Prev:  v${prev.version} @ ${prev.commit} (${prev.ts.split("T")[0]})`);
  }

  console.log(`\n  Recorded to .loophaus/benchmark.tsv (${history.length} entries)`);
}
