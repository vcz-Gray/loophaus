import type { CliContext } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { listLoops } = await import("../../core/loop-registry.js");
  const loops = await listLoops();
  if (loops.length === 0) { console.log("No active loops."); return; }
  console.log("Active Loops");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  for (const l of loops) {
    const status = l.active ? "active" : "done";
    const maxIter = l.maxIterations as number || 0;
    const curIter = l.currentIteration as number || 0;
    const iter = maxIter > 0 ? `${curIter}/${maxIter}` : `${curIter}`;
    console.log(`  ${l.name}  [${status}]  iter ${iter}`);
  }
}
