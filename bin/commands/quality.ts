import { access } from "node:fs/promises";
import { join } from "node:path";
import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const storyId = ctx.getFlag("--story");
  const cwd = process.cwd();

  if (storyId) {
    const { evaluateStory } = await import("../../core/quality-scorer.js");
    const { read } = await import("../../store/state-store.js");
    const state = await read(cwd);
    const config: Record<string, unknown> = (state.qualityConfig as unknown as Record<string, unknown>) || {};

    if (!config.typecheckCommand) {
      try { await access(join(cwd, "tsconfig.json")); config.typecheckCommand = "npx tsc --noEmit"; } catch { /* no tsconfig */ }
    }

    const result = await evaluateStory(storyId, cwd, config);
    console.log(`Quality: ${storyId}`);
    console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    console.log(`Score: ${result.score}/100 (${result.grade})`);
    for (const [k, v] of Object.entries(result.breakdown)) {
      const numVal = v as number;
      const bar = "\u2588".repeat(numVal) + "\u2591".repeat(10 - numVal);
      console.log(`  ${k.padEnd(10)} ${bar} ${numVal}/10`);
    }
  } else {
    const { readResults } = await import("../../core/quality-scorer.js");
    const results = await readResults(cwd);
    if (results.length === 0) { console.log("No quality results yet. Run /loop-plan first."); return; }

    console.log("Quality Results");
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    const byStory: Record<string, typeof results> = {};
    for (const r of results) {
      if (!byStory[r.storyId]) byStory[r.storyId] = [];
      byStory[r.storyId].push(r);
    }
    for (const [sid, attempts] of Object.entries(byStory)) {
      const best = attempts.reduce((a, b) => (a.score > b.score ? a : b));
      const icon = best.status === "keep" ? "\u2713" : best.status === "discard" ? "\u2717" : "~";
      console.log(`  ${icon} ${sid}  score: ${best.score}  (${attempts.length} attempts)`);
    }
  }
}
