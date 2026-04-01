// Best-effort trace logger. Failures never affect stop-hook decisions.

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";

import type { LoopEvent } from "./types.js";

const DEBUG = process.env.LOOPHAUS_DEBUG === "1";

function debug(msg: string): void {
  if (DEBUG) process.stderr.write(`[loophaus:debug] ${msg}\n`);
}

function isFileNotFound(err: unknown): boolean {
  return err != null && typeof err === "object" && ("code" in err) && ((err as { code: string }).code === "ENOENT" || (err as { code: string }).code === "ENOTDIR");
}

export function getTracePath(cwd?: string): string {
  return join(cwd || process.cwd(), ".loophaus", "trace.jsonl");
}

export async function logEvents(events: LoopEvent[], metadata: Record<string, unknown> = {}, cwd?: string): Promise<void> {
  try {
    const tracePath = getTracePath(cwd);
    await mkdir(dirname(tracePath), { recursive: true });

    const ts = new Date().toISOString();
    const lines = events.map(e =>
      JSON.stringify({ ts, ...metadata, ...e })
    ).join("\n") + "\n";

    await appendFile(tracePath, lines, "utf-8");
  } catch (err) {
    debug(`logEvents failed: ${(err as Error).message}`);
    // Best-effort: non-ENOENT errors are logged if DEBUG is on, but never thrown
  }
}

export async function readTrace(cwd?: string): Promise<Record<string, unknown>[]> {
  const tracePath = getTracePath(cwd);
  try {
    const raw = await readFile(tracePath, "utf-8");
    return raw.trim().split("\n").map(line => {
      try { return JSON.parse(line) as Record<string, unknown>; } catch { return null; }
    }).filter((v): v is Record<string, unknown> => v !== null);
  } catch (err) {
    if (!isFileNotFound(err)) {
      debug(`readTrace failed: ${(err as Error).message}`);
    }
    return [];
  }
}
