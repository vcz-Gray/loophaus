import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveCheckpoint, loadCheckpoint, listSessions } from "../core/session.mjs";

let tempDir;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), "loophaus-sess-")); });
afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

describe("saveCheckpoint", () => {
  it("saves and loads", async () => {
    await saveCheckpoint("test-123", { prompt: "build auth", currentIteration: 5 }, tempDir);
    const loaded = await loadCheckpoint("test-123", tempDir);
    expect(loaded.sessionId).toBe("test-123");
    expect(loaded.prompt).toBe("build auth");
    expect(loaded.currentIteration).toBe(5);
    expect(loaded.savedAt).toBeDefined();
  });
});

describe("loadCheckpoint", () => {
  it("returns null for missing", async () => {
    expect(await loadCheckpoint("nonexistent", tempDir)).toBeNull();
  });
});

describe("listSessions", () => {
  it("lists saved sessions", async () => {
    await saveCheckpoint("sess-1", { prompt: "a" }, tempDir);
    await saveCheckpoint("sess-2", { prompt: "b" }, tempDir);
    const sessions = await listSessions(tempDir);
    expect(sessions).toHaveLength(2);
  });

  it("returns empty for no sessions", async () => {
    expect(await listSessions(tempDir)).toEqual([]);
  });
});
