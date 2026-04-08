import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const sub = ctx.args[1];
  const { createWorktree, removeWorktree, listWorktrees } = await import("../../core/worktree.js");

  switch (sub) {
    case "create": {
      const name = ctx.args[2];
      const base = ctx.args[3] || "HEAD";
      if (!name) { console.log("Usage: loophaus worktree create <name> [base-branch]"); return; }
      const wt = await createWorktree(name, base);
      console.log(`Created worktree: ${wt.name} at ${wt.path} (branch: ${wt.branch})`);
      break;
    }
    case "remove": {
      const name = ctx.args[2];
      if (!name) { console.log("Usage: loophaus worktree remove <name>"); return; }
      await removeWorktree(name);
      console.log(`Removed worktree: ${name}`);
      break;
    }
    case "list": {
      const wts = await listWorktrees();
      if (wts.length === 0) { console.log("No loophaus worktrees."); return; }
      console.log("Worktrees");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      for (const wt of wts) {
        console.log(`  ${wt.name}  ${wt.branch}  ${wt.path}`);
      }
      break;
    }
    default:
      console.log("Usage: loophaus worktree <create|remove|list>");
  }
}
