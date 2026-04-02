// core/worktree.ts
// Git worktree lifecycle management

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, access } from "node:fs/promises";
import { basename, join } from "node:path";

import type { WorktreeInfo } from "./types.js";

const execFileAsync = promisify(execFile);

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function getRepoRoot(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

function validateWorktreeName(name: string): void {
  if (!name || typeof name !== "string") throw new Error("Worktree name is required");
  if (/[\/\\]/.test(name)) throw new Error(`Worktree name must not contain path separators: ${name}`);
  if (name.includes("..")) throw new Error(`Worktree name must not contain '..': ${name}`);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error(`Worktree name contains invalid characters: ${name}. Use alphanumeric, dot, dash, or underscore.`);
}

export async function createWorktree(name: string, baseBranch: string = "HEAD"): Promise<{ name: string; path: string; branch: string }> {
  validateWorktreeName(name);
  const root = await getRepoRoot();
  if (!root) throw new Error("Not in a git repository");

  const worktreePath = join(root, ".loophaus", "worktrees", name);
  const branchName = `loophaus/${name}`;

  if (await fileExists(worktreePath)) {
    throw new Error(`Worktree already exists: ${name}`);
  }

  await mkdir(join(root, ".loophaus", "worktrees"), { recursive: true });

  await execFileAsync("git", ["worktree", "add", "-b", branchName, worktreePath, baseBranch]);

  return { name, path: worktreePath, branch: branchName };
}

export async function removeWorktree(name: string): Promise<{ name: string; removed: boolean }> {
  validateWorktreeName(name);
  const root = await getRepoRoot();
  if (!root) throw new Error("Not in a git repository");

  const worktreePath = join(root, ".loophaus", "worktrees", name);

  if (!(await fileExists(worktreePath))) {
    throw new Error(`Worktree not found: ${name}`);
  }

  await execFileAsync("git", ["worktree", "remove", worktreePath, "--force"]);

  const branchName = `loophaus/${name}`;
  try {
    await execFileAsync("git", ["branch", "-D", branchName]);
  } catch { /* branch may not exist */ }

  return { name, removed: true };
}

export async function listWorktrees(): Promise<WorktreeInfo[]> {
  const root = await getRepoRoot();
  if (!root) return [];

  try {
    const { stdout } = await execFileAsync("git", ["worktree", "list", "--porcelain"]);
    const entries: Array<{ path?: string; head?: string; branch?: string; bare?: boolean }> = [];
    let current: { path?: string; head?: string; branch?: string; bare?: boolean } = {};

    for (const line of stdout.split(/\r?\n/)) {
      if (line.startsWith("worktree ")) {
        if (current.path) entries.push(current);
        current = { path: line.slice(9) };
      } else if (line.startsWith("HEAD ")) {
        current.head = line.slice(5);
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice(7);
      } else if (line === "bare") {
        current.bare = true;
      } else if (line === "") {
        if (current.path) entries.push(current);
        current = {};
      }
    }

    const loophausDir = join(root, ".loophaus", "worktrees");
    return entries.filter(e => e.path && e.path.startsWith(loophausDir)).map(e => ({
      name: basename(e.path!),
      path: e.path!,
      branch: e.branch || "",
      head: e.head || "",
    }));
  } catch {
    return [];
  }
}
