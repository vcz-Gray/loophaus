import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readState,
  writeState,
  resetState,
  incrementIteration,
} from "../store/state-store.mjs";

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ralph-test-"));
  process.env.LOOPHAUS_STATE_FILE = join(tempDir, "state.json");
});

afterEach(async () => {
  delete process.env.LOOPHAUS_STATE_FILE;
  await rm(tempDir, { recursive: true, force: true });
});

describe("state.mjs", () => {
  it("readState returns defaults when no file exists", async () => {
    const state = await readState();
    expect(state.active).toBe(false);
    expect(state.prompt).toBe("");
    expect(state.completionPromise).toBe("TADA");
    expect(state.maxIterations).toBe(20);
    expect(state.currentIteration).toBe(0);
    expect(state.sessionId).toBe("");
  });

  it("writeState creates file with correct content", async () => {
    const data = {
      active: true,
      prompt: "Build API",
      completionPromise: "DONE",
      maxIterations: 10,
      currentIteration: 3,
      sessionId: "abc-123",
    };
    await writeState(data);

    const raw = await readFile(process.env.LOOPHAUS_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.active).toBe(true);
    expect(parsed.prompt).toBe("Build API");
    expect(parsed.currentIteration).toBe(3);
  });

  it("resetState sets active to false", async () => {
    await writeState({
      active: true,
      prompt: "test",
      completionPromise: "X",
      maxIterations: 5,
      currentIteration: 2,
      sessionId: "",
    });
    await resetState();
    const state = await readState();
    expect(state.active).toBe(false);
    expect(state.currentIteration).toBe(0);
  });

  it("incrementIteration increases counter by 1", async () => {
    await writeState({
      active: true,
      prompt: "test",
      completionPromise: "X",
      maxIterations: 10,
      currentIteration: 5,
      sessionId: "",
    });
    const updated = await incrementIteration();
    expect(updated.currentIteration).toBe(6);

    const reread = await readState();
    expect(reread.currentIteration).toBe(6);
  });

  it("auto-creates directory if missing", async () => {
    const nested = join(tempDir, "deep", "nested", "state.json");
    process.env.LOOPHAUS_STATE_FILE = nested;
    await writeState({
      active: true,
      prompt: "test",
      completionPromise: "",
      maxIterations: 0,
      currentIteration: 0,
      sessionId: "",
    });
    const raw = await readFile(nested, "utf-8");
    expect(JSON.parse(raw).active).toBe(true);
  });
});
