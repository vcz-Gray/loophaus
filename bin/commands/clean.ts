import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const { cleanAll, cleanTraces, cleanSessions, cleanResults, readConfig } = await import("../../core/cleanup.js");

  const hasFlag = (f: string): boolean => ctx.args.includes(f);

  if (hasFlag("--config")) {
    const config = await readConfig();
    console.log("Cleanup Config (.loophaus/config.json)");
    console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    console.log(`  onNewPlan:           ${config.cleanup.onNewPlan}`);
    console.log(`  traceRetentionDays:  ${config.cleanup.traceRetentionDays}`);
    console.log(`  sessionRetentionDays: ${config.cleanup.sessionRetentionDays}`);
    return;
  }

  if (!hasFlag("--all") && !hasFlag("--traces") && !hasFlag("--sessions") && !hasFlag("--results")) {
    console.log(`Usage: loophaus clean [options]

Options:
  --all        Remove traces + results + sessions (not benchmark.tsv)
  --traces     Remove trace.jsonl only
  --sessions   Remove session checkpoints
  --results    Remove results.tsv only
  --before DATE  Only remove data before this date (sessions only)
  --config     Show current cleanup policy`);
    return;
  }

  const beforeRaw = ctx.getFlag("--before");
  const before = beforeRaw ? new Date(beforeRaw) : undefined;

  let result;
  if (hasFlag("--all")) {
    result = await cleanAll();
  } else {
    result = { removed: [] as string[], archived: [] as string[], skipped: [] as string[] };
    if (hasFlag("--traces")) {
      const r = await cleanTraces();
      result.removed.push(...r.removed);
      result.skipped.push(...r.skipped);
    }
    if (hasFlag("--results")) {
      const r = await cleanResults();
      result.removed.push(...r.removed);
      result.skipped.push(...r.skipped);
    }
    if (hasFlag("--sessions")) {
      const r = await cleanSessions({ before });
      result.removed.push(...r.removed);
      result.skipped.push(...r.skipped);
    }
  }

  console.log("Clean Complete");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  if (result.removed.length > 0) {
    console.log(`  Removed: ${result.removed.join(", ")}`);
  }
  if (result.archived.length > 0) {
    console.log(`  Archived: ${result.archived.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    console.log(`  Skipped: ${result.skipped.join(", ")}`);
  }
  if (result.removed.length === 0 && result.archived.length === 0) {
    console.log("  Nothing to clean.");
  }
}
