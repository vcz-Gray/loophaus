// core/cleanup.ts
// Data lifecycle management for .loophaus/ directory

import { readFile, writeFile, readdir, rm, rename, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

export interface CleanupConfig {
  cleanup: {
    onNewPlan: "archive" | "delete" | "keep";
    traceRetentionDays: number;
    sessionRetentionDays: number;
  };
}

const DEFAULT_CONFIG: CleanupConfig = {
  cleanup: {
    onNewPlan: "keep",
    traceRetentionDays: 30,
    sessionRetentionDays: 7,
  },
};

// Files that are NEVER deleted by any clean operation
const PROTECTED_FILES = new Set(["benchmark.tsv", "config.json"]);

function getLoophausDir(cwd?: string): string {
  return join(cwd || process.cwd(), ".loophaus");
}

export async function readConfig(cwd?: string): Promise<CleanupConfig> {
  const configPath = join(getLoophausDir(cwd), "config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CleanupConfig>;
    return {
      cleanup: { ...DEFAULT_CONFIG.cleanup, ...parsed.cleanup },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeConfig(config: CleanupConfig, cwd?: string): Promise<void> {
  const dir = getLoophausDir(cwd);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "config.json"), JSON.stringify(config, null, 2), "utf-8");
}

export interface CleanResult {
  removed: string[];
  archived: string[];
  skipped: string[];
}

export async function cleanTraces(cwd?: string): Promise<CleanResult> {
  const dir = getLoophausDir(cwd);
  const result: CleanResult = { removed: [], archived: [], skipped: [] };
  const tracePath = join(dir, "trace.jsonl");
  try {
    await rm(tracePath);
    result.removed.push("trace.jsonl");
  } catch {
    result.skipped.push("trace.jsonl");
  }
  return result;
}

export async function cleanResults(cwd?: string): Promise<CleanResult> {
  const dir = getLoophausDir(cwd);
  const result: CleanResult = { removed: [], archived: [], skipped: [] };
  const resultsPath = join(dir, "results.tsv");
  try {
    await rm(resultsPath);
    result.removed.push("results.tsv");
  } catch {
    result.skipped.push("results.tsv");
  }
  return result;
}

export async function cleanSessions(options?: { cwd?: string; before?: Date }): Promise<CleanResult> {
  const dir = join(getLoophausDir(options?.cwd), "sessions");
  const result: CleanResult = { removed: [], archived: [], skipped: [] };
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(dir, file);
      if (options?.before) {
        const s = await stat(filePath);
        if (s.mtime >= options.before) {
          result.skipped.push(file);
          continue;
        }
      }
      await rm(filePath);
      result.removed.push(file);
    }
  } catch {
    // sessions/ doesn't exist
  }
  return result;
}

export async function cleanAll(cwd?: string): Promise<CleanResult> {
  const result: CleanResult = { removed: [], archived: [], skipped: [] };
  const r1 = await cleanTraces(cwd);
  const r2 = await cleanResults(cwd);
  const r3 = await cleanSessions({ cwd });
  result.removed.push(...r1.removed, ...r2.removed, ...r3.removed);
  result.skipped.push(...r1.skipped, ...r2.skipped, ...r3.skipped);
  // Explicitly note protected files
  result.skipped.push("benchmark.tsv (protected)", "config.json (protected)");
  return result;
}

export async function archiveCurrentData(cwd?: string): Promise<CleanResult> {
  const dir = getLoophausDir(cwd);
  const result: CleanResult = { removed: [], archived: [], skipped: [] };
  const dateStr = new Date().toISOString().split("T")[0];
  const archiveDir = join(dir, "archive", dateStr);
  await mkdir(archiveDir, { recursive: true });

  const filesToArchive = ["trace.jsonl", "results.tsv"];
  for (const file of filesToArchive) {
    const src = join(dir, file);
    const dest = join(archiveDir, file);
    try {
      await rename(src, dest);
      result.archived.push(`${file} → archive/${dateStr}/${file}`);
    } catch {
      result.skipped.push(file);
    }
  }

  // Archive sessions
  const sessionsDir = join(dir, "sessions");
  try {
    const files = await readdir(sessionsDir);
    if (files.length > 0) {
      const sessArchive = join(archiveDir, "sessions");
      await mkdir(sessArchive, { recursive: true });
      for (const file of files) {
        await rename(join(sessionsDir, file), join(sessArchive, file));
        result.archived.push(`sessions/${file}`);
      }
    }
  } catch {
    // no sessions
  }

  return result;
}

export async function applyOnNewPlanPolicy(cwd?: string): Promise<CleanResult> {
  const config = await readConfig(cwd);
  switch (config.cleanup.onNewPlan) {
    case "archive":
      return archiveCurrentData(cwd);
    case "delete":
      return cleanAll(cwd);
    case "keep":
    default:
      return { removed: [], archived: [], skipped: ["policy: keep (no cleanup)"] };
  }
}
