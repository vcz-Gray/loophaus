import type { CliContext } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { readTrace } = await import("../../core/event-logger.js");
  const { formatCost } = await import("../../core/cost-tracker.js");
  const events = await readTrace();
  if (events.length === 0) {
    console.log("No trace data found. Run a loop first.");
    return;
  }
  const iterations = events.filter((e) => e.event === "iteration").length;
  const stops = events.filter((e) => e.event === "stop");
  const lastStop = stops[stops.length - 1];
  console.log(`Loop Stats`);
  console.log(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`Total iterations: ${iterations}`);
  console.log(`Total stops:      ${stops.length}`);
  if (lastStop) {
    console.log(`Last stop reason: ${lastStop.reason || "unknown"}`);
    console.log(`Last stop at:     ${lastStop.ts || "unknown"}`);
  }

  const costEvents = events.filter((e) => e.event === "cost" || e.totalCost);
  if (costEvents.length > 0) {
    const totalCost = costEvents.reduce((s, e) => s + ((e.totalCost as number) || 0), 0);
    console.log(`Estimated cost:   ${formatCost(totalCost)}`);
  }

  console.log(`Trace file:       .loophaus/trace.jsonl (${events.length} events)`);
}
