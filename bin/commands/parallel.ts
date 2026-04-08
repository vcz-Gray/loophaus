import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const prdPath = ctx.args[1] || "prd.json";
  const count = ctx.getNumericFlag("--count", 2);
  const base = ctx.getFlag("--base") || "HEAD";

  const { runParallel } = await import("../../core/parallel-runner.js");
  const result = await runParallel({ prdPath, count, baseBranch: base });
  console.log(result.message);
  if (result.worktrees) {
    console.log("\nWorktrees:");
    for (const wt of result.worktrees) {
      console.log(`  ${wt.name}  branch:${wt.branch}  stories:[${wt.stories.join(",")}]`);
    }
  }
}
