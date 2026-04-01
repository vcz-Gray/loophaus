// core/loop-registry.ts — Multi-loop registry for named loop instances

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface LoopEntry {
  name: string;
  active?: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function listLoops(cwd?: string): Promise<LoopEntry[]> {
  const loopsDir = join(cwd || process.cwd(), ".loophaus", "loops");
  const loops: LoopEntry[] = [];
  try {
    const entries = await readdir(loopsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const statePath = join(loopsDir, entry.name, "state.json");
      try {
        const raw = await readFile(statePath, "utf-8");
        const state = JSON.parse(raw) as Record<string, unknown>;
        loops.push({ name: entry.name, ...state });
      } catch {
        loops.push({ name: entry.name, active: false, error: "unreadable" });
      }
    }
  } catch { /* no loops dir */ }

  const defaultPath = join(cwd || process.cwd(), ".loophaus", "state.json");
  try {
    const raw = await readFile(defaultPath, "utf-8");
    const state = JSON.parse(raw) as Record<string, unknown>;
    loops.unshift({ name: "(default)", ...state });
  } catch { /* no default */ }

  return loops;
}

export async function getLoop(name: string, cwd?: string): Promise<LoopEntry | null> {
  const loops = await listLoops(cwd);
  return loops.find(l => l.name === name) || null;
}
