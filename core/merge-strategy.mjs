// core/merge-strategy.mjs
// Strategies for merging parallel worktree results back

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const STRATEGIES = {
  sequential: "Merge branches one by one in order",
  "cherry-pick": "Cherry-pick specific commits from each branch",
  squash: "Squash each branch into a single commit before merging",
};

export async function mergeSequential(branches, targetBranch = "main") {
  const results = [];
  for (const branch of branches) {
    try {
      await execFileAsync("git", ["merge", branch, "--no-edit"]);
      results.push({ branch, status: "merged" });
    } catch (err) {
      results.push({ branch, status: "conflict", error: err.message });
      try { await execFileAsync("git", ["merge", "--abort"]); } catch {}
      break;
    }
  }
  return results;
}

export async function mergeSquash(branches) {
  const results = [];
  for (const branch of branches) {
    try {
      await execFileAsync("git", ["merge", "--squash", branch]);
      await execFileAsync("git", ["commit", "-m", `squash: merge ${branch}`]);
      results.push({ branch, status: "squashed" });
    } catch (err) {
      results.push({ branch, status: "conflict", error: err.message });
      try { await execFileAsync("git", ["merge", "--abort"]); } catch {}
      break;
    }
  }
  return results;
}

export async function mergeCherryPick(branches) {
  const results = [];
  for (const branch of branches) {
    try {
      const { stdout } = await execFileAsync("git", ["log", `main..${branch}`, "--format=%H", "--reverse"]);
      const commits = stdout.trim().split("\n").filter(Boolean);
      for (const commit of commits) {
        await execFileAsync("git", ["cherry-pick", commit]);
      }
      results.push({ branch, status: "cherry-picked", commits: commits.length });
    } catch (err) {
      results.push({ branch, status: "conflict", error: err.message });
      try { await execFileAsync("git", ["cherry-pick", "--abort"]); } catch {}
      break;
    }
  }
  return results;
}

export async function merge(strategy, branches, targetBranch) {
  if (!strategy || typeof strategy !== "string") throw new Error("Merge strategy is required");
  if (!Array.isArray(branches)) throw new Error("Branches must be an array");
  switch (strategy) {
    case "sequential": return mergeSequential(branches, targetBranch);
    case "squash": return mergeSquash(branches);
    case "cherry-pick": return mergeCherryPick(branches);
    default: throw new Error(`Unknown merge strategy: ${strategy}`);
  }
}
