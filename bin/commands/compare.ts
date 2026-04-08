import type { LoopEvent } from "../../core/types.js";
import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const file1 = ctx.args[1];
  const file2 = ctx.args[2];
  if (!file1 || !file2) {
    console.log("Usage: loophaus compare <trace1> <trace2>");
    process.exit(1);
  }

  const { readFile } = await import("node:fs/promises");
  const { compareTraces } = await import("../../core/trace-analyzer.js");

  function loadTrace(traceFile: string): Promise<LoopEvent[]> {
    return readFile(traceFile, "utf-8").then((raw) =>
      raw.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as LoopEvent[]
    );
  }

  const [t1, t2] = await Promise.all([loadTrace(file1), loadTrace(file2)]);
  const result = compareTraces(t1, t2);

  console.log("Loop Comparison");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  const fmt = (label: string, v1: string | number, v2: string | number, diff: string | number, unit = ""): void => {
    const arrow = Number(diff) > 0 ? `+${diff}` : `${diff}`;
    const color = Number(diff) > 0 ? "\x1b[31m" : Number(diff) < 0 ? "\x1b[32m" : "";
    const reset = "\x1b[0m";
    console.log(`  ${label.padEnd(20)} ${String(v1).padStart(8)}${unit}  vs  ${String(v2).padStart(8)}${unit}  ${color}(${arrow}${unit})${reset}`);
  };

  fmt("Iterations", result.trace1.iterations, result.trace2.iterations, result.diff.iterations);
  fmt("Duration", Math.round(result.trace1.durationMs / 1000), Math.round(result.trace2.durationMs / 1000), Math.round(result.diff.durationMs / 1000), "s");
  fmt("Stories done", result.trace1.storiesCompleted, result.trace2.storiesCompleted, result.diff.storiesCompleted);
  if (result.trace1.totalCost || result.trace2.totalCost) {
    fmt("Cost", result.trace1.totalCost.toFixed(4), result.trace2.totalCost.toFixed(4), result.diff.totalCost.toFixed(4), "$");
  }
  fmt("Errors", result.trace1.errors, result.trace2.errors, result.trace2.errors - result.trace1.errors);
  console.log("");
}
