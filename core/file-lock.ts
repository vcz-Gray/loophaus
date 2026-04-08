// core/file-lock.ts
// File-based exclusive lock using mkdir (atomic on all platforms)

import { mkdir, rm, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STALE_TIMEOUT_MS = 60_000; // 60s — lock is stale if holder hasn't updated
const RETRY_INTERVAL_MS = 100;
const MAX_RETRIES = 50; // 5 seconds total wait

export interface LockHandle {
  release: () => Promise<void>;
}

function getLockDir(statePath: string): string {
  return statePath + ".lock";
}

function getPidFile(lockDir: string): string {
  return join(lockDir, "pid");
}

async function isLockStale(lockDir: string): Promise<boolean> {
  try {
    const pidFile = getPidFile(lockDir);
    const raw = await readFile(pidFile, "utf-8");
    const data = JSON.parse(raw) as { pid: number; ts: number };
    const age = Date.now() - data.ts;
    if (age > STALE_TIMEOUT_MS) return true;
    // Check if process is still alive
    try {
      process.kill(data.pid, 0);
      return false; // process exists
    } catch {
      return true; // process gone
    }
  } catch {
    return true; // can't read pid file → stale
  }
}

async function writePidFile(lockDir: string): Promise<void> {
  const pidFile = getPidFile(lockDir);
  await writeFile(pidFile, JSON.stringify({ pid: process.pid, ts: Date.now() }), "utf-8");
}

export async function acquireLock(statePath: string): Promise<LockHandle> {
  const lockDir = getLockDir(statePath);
  let acquired = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mkdir(lockDir); // atomic — fails if exists
      acquired = true;
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      // Lock exists — check if stale
      if (await isLockStale(lockDir)) {
        try {
          await rm(lockDir, { recursive: true, force: true });
          continue; // retry immediately
        } catch {
          // Someone else cleaned it — retry
        }
      }
      // Wait and retry
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }

  if (!acquired) {
    throw new Error(`Could not acquire lock on ${statePath} after ${MAX_RETRIES * RETRY_INTERVAL_MS}ms. Another loophaus process may be running.`);
  }

  await writePidFile(lockDir);

  return {
    async release() {
      try {
        await rm(lockDir, { recursive: true, force: true });
      } catch {
        // Best effort — lock dir may already be gone
      }
    },
  };
}

export async function withLock<T>(statePath: string, fn: () => Promise<T>): Promise<T> {
  const lock = await acquireLock(statePath);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
