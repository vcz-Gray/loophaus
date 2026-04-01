// Best-effort trace logger. Failures never affect stop-hook decisions.

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";

const DEBUG = process.env.LOOPHAUS_DEBUG === "1";

function debug(msg) {
  if (DEBUG) process.stderr.write(`[loophaus:debug] ${msg}\n`);
}

function isFileNotFound(err) {
  return err && (err.code === "ENOENT" || err.code === "ENOTDIR");
}

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
  } catch (err) {
    debug(`logEvents failed: ${err.message}`);
    // Best-effort: non-ENOENT errors are logged if DEBUG is on, but never thrown
  }
}

export async function readTrace(cwd) {
  const tracePath = getTracePath(cwd);
  try {
    const raw = await readFile(tracePath, "utf-8");
    return raw.trim().split("\n").map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    if (!isFileNotFound(err)) {
      debug(`readTrace failed: ${err.message}`);
    }
    return [];
  }
}
