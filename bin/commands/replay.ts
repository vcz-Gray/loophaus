import type { LoopEvent } from "../../core/types.js";
import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const file = ctx.args[1];
  if (!file) {
    console.log("Usage: loophaus replay <trace-file> [--speed 2]");
    process.exit(1);
  }
  const speedRaw = ctx.getFlag("--speed");
  const speed = speedRaw === "instant" ? 999999 : ctx.getNumericFlag("--speed", 1);
  const speedLabel = speed >= 999999 ? "instant" : `${speed}x`;

  const { readTrace } = await import("../../core/event-logger.js");
  const { replayTrace, analyzeTrace } = await import("../../core/trace-analyzer.js");

  let events: LoopEvent[];
  if (file === ".loophaus/trace.jsonl" || file === "trace.jsonl") {
    events = await readTrace() as LoopEvent[];
  } else {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(file, "utf-8");
    events = raw.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as LoopEvent[];
  }

  if (events.length === 0) { console.log("No events found."); return; }

  const replayed = replayTrace(events, speed);
  const analysis = analyzeTrace(events);

  console.log(`Replaying ${events.length} events (${speedLabel})\n`);

  const COLORS: Record<string, string> = { iteration: "\x1b[36m", stop: "\x1b[31m", continue: "\x1b[32m", error: "\x1b[31m", cost: "\x1b[33m", state_change: "\x1b[35m", verify_script: "\x1b[32m", verify_failed: "\x1b[31m", story_complete: "\x1b[32m", loop_start: "\x1b[36m", loop_end: "\x1b[36m" };
  const RESET = "\x1b[0m";

  let prevMs = 0;
  for (const e of replayed) {
    const delay = speed >= 999999 ? 0 : e.relativeMs - prevMs;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    prevMs = e.relativeMs;

    const color = COLORS[e.event as string] || "";
    const time = e.ts ? new Date(e.ts as string).toLocaleTimeString() : "";
    const detail = e.iteration ? ` iter=${e.iteration}` : e.reason ? ` reason=${e.reason}` : "";
    console.log(`${color}[${time}] ${e.event}${detail}${RESET}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Iterations: ${analysis.iterations}`);
  console.log(`Duration: ${Math.round(analysis.durationMs / 1000)}s`);
  if (analysis.totalCost > 0) console.log(`Cost: $${analysis.totalCost.toFixed(4)}`);
  if (analysis.lastStopReason) console.log(`Stop reason: ${analysis.lastStopReason}`);
}
