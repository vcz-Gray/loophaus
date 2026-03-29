// Best-effort trace logger. Failures never affect stop-hook decisions.

import { appendFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export function getTracePath(cwd) {
  return join(cwd || process.cwd(), ".loophaus", "trace.jsonl");
}

export async function logEvents(events, metadata = {}, cwd) {
  try {
    const tracePath = getTracePath(cwd);
    await mkdir(dirname(tracePath), { recursive: true });

    const ts = new Date().toISOString();
    const lines = events.map(e =>
      JSON.stringify({ ts, ...metadata, ...e })
    ).join("\n") + "\n";

    await appendFile(tracePath, lines, "utf-8");
  } catch {
    // Best-effort: silently ignore failures
  }
}

export async function readTrace(cwd) {
  const tracePath = getTracePath(cwd);
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(tracePath, "utf-8");
    return raw.trim().split("\n").map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}
