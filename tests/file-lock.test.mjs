import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { acquireLock, withLock } from "../core/file-lock.js";

describe("acquireLock", () => {
  it("acquires and releases a lock", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lock-test-"));
    const statePath = join(dir, "state.json");
    await writeFile(statePath, "{}", "utf-8");

    const lock = await acquireLock(statePath);
    expect(lock).toBeDefined();
    expect(lock.release).toBeTypeOf("function");
    await lock.release();
    await rm(dir, { recursive: true });
  });

  it("blocks concurrent access then succeeds after release", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lock-test-"));
    const statePath = join(dir, "state.json");
    await writeFile(statePath, "{}", "utf-8");

    const lock1 = await acquireLock(statePath);

    // Start second lock attempt in background
    let lock2Resolved = false;
    const lock2Promise = acquireLock(statePath).then(l => {
      lock2Resolved = true;
      return l;
    });

    // Give it a moment — should NOT resolve yet
    await new Promise(r => setTimeout(r, 300));
    expect(lock2Resolved).toBe(false);

    // Release first lock
    await lock1.release();

    // Second lock should now acquire
    const lock2 = await lock2Promise;
    expect(lock2Resolved).toBe(true);
    await lock2.release();
    await rm(dir, { recursive: true });
  });

  it("detects and cleans stale locks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lock-test-"));
    const statePath = join(dir, "state.json");
    await writeFile(statePath, "{}", "utf-8");

    // Create a fake stale lock with a dead PID
    const lockDir = statePath + ".lock";
    await mkdir(lockDir);
    await writeFile(join(lockDir, "pid"), JSON.stringify({ pid: 999999, ts: Date.now() - 120_000 }), "utf-8");

    // Should acquire despite existing lock dir (stale)
    const lock = await acquireLock(statePath);
    expect(lock).toBeDefined();
    await lock.release();
    await rm(dir, { recursive: true });
  });
});

describe("withLock", () => {
  it("executes function under lock and returns result", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lock-test-"));
    const statePath = join(dir, "state.json");
    await writeFile(statePath, "{}", "utf-8");

    const result = await withLock(statePath, async () => {
      return 42;
    });
    expect(result).toBe(42);
    await rm(dir, { recursive: true });
  });

  it("releases lock even on error", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lock-test-"));
    const statePath = join(dir, "state.json");
    await writeFile(statePath, "{}", "utf-8");

    try {
      await withLock(statePath, async () => { throw new Error("boom"); });
    } catch {}

    // Should be able to acquire again (lock was released)
    const lock = await acquireLock(statePath);
    await lock.release();
    await rm(dir, { recursive: true });
  });
});
