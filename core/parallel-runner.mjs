// core/parallel-runner.mjs
// Parallel loop execution across worktrees

import { fork } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorktree, removeWorktree, listWorktrees } from "./worktree.mjs";

const __filename = fileURLToPath(import.meta.url);
const HOOKS_DIR = resolve(dirname(__filename), "..", "hooks");

export function distributeStories(stories, n) {
  const sorted = [...stories].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  const buckets = Array.from({ length: n }, () => []);
  sorted.forEach((story, i) => buckets[i % n].push(story));
  return buckets;
}

export async function runParallel({ prdPath, count = 2, baseBranch = "HEAD", cwd }) {
  const raw = await readFile(prdPath, "utf-8");
  const prd = JSON.parse(raw);
  const pending = (prd.userStories || []).filter(s => !s.passes);

  if (pending.length === 0) {
    return { success: true, message: "No pending stories.", results: [] };
  }

  const effectiveCount = Math.min(count, pending.length);
  const buckets = distributeStories(pending, effectiveCount);

  const worktrees = [];
  for (let i = 0; i < effectiveCount; i++) {
    const name = `parallel-${i}`;
    try {
      const wt = await createWorktree(name, baseBranch);
      worktrees.push({ ...wt, stories: buckets[i] });
    } catch (err) {
      for (const prev of worktrees) {
        try { await removeWorktree(prev.name); } catch {}
      }
      throw new Error(`Failed to create worktree ${name}: ${err.message}`);
    }
  }

  for (const wt of worktrees) {
    const wtPrd = {
      ...prd,
      userStories: wt.stories,
    };
    const wtPrdPath = join(wt.path, "prd.json");
    await writeFile(wtPrdPath, JSON.stringify(wtPrd, null, 2), "utf-8");

    const stateDir = join(wt.path, ".loophaus");
    await mkdir(stateDir, { recursive: true });
    await writeFile(join(stateDir, "state.json"), JSON.stringify({
      active: true,
      prompt: `Implement stories from prd.json. Work on one story at a time.`,
      completionPromise: "TASK COMPLETE",
      maxIterations: wt.stories.length * 2 + 3,
      currentIteration: 0,
      sessionId: "",
      name: wt.name,
      startedAt: new Date().toISOString(),
    }, null, 2), "utf-8");
  }

  return {
    success: true,
    worktrees: worktrees.map(wt => ({
      name: wt.name,
      path: wt.path,
      branch: wt.branch,
      stories: wt.stories.map(s => s.id),
    })),
    message: `Created ${effectiveCount} parallel worktrees with ${pending.length} stories distributed.`,
  };
}

export async function cleanupParallel() {
  const worktrees = await listWorktrees();
  const results = [];
  for (const wt of worktrees) {
    if (wt.name.startsWith("parallel-")) {
      try {
        await removeWorktree(wt.name);
        results.push({ name: wt.name, removed: true });
      } catch (err) {
        results.push({ name: wt.name, removed: false, error: err.message });
      }
    }
  }
  return results;
}
