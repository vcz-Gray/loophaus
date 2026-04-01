import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listLoops, getLoop } from "../core/loop-registry.js";

let tempDir;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), "loophaus-reg-")); });
afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

describe("listLoops", () => {
  it("returns empty for no loops", async () => {
    const loops = await listLoops(tempDir);
    expect(loops).toEqual([]);
  });

  it("finds default loop", async () => {
    await mkdir(join(tempDir, ".loophaus"), { recursive: true });
    await writeFile(join(tempDir, ".loophaus", "state.json"), JSON.stringify({
      active: true, prompt: "test", maxIterations: 10, currentIteration: 3
    }));
    const loops = await listLoops(tempDir);
    expect(loops.length).toBe(1);
    expect(loops[0].name).toBe("(default)");
    expect(loops[0].active).toBe(true);
  });

  it("finds named loops", async () => {
    await mkdir(join(tempDir, ".loophaus", "loops", "auth"), { recursive: true });
    await writeFile(join(tempDir, ".loophaus", "loops", "auth", "state.json"), JSON.stringify({
      active: true, prompt: "auth", maxIterations: 20, currentIteration: 5
    }));
    const loops = await listLoops(tempDir);
    expect(loops.length).toBe(1);
    expect(loops[0].name).toBe("auth");
  });
});

describe("getLoop", () => {
  it("returns null for nonexistent", async () => {
    expect(await getLoop("nope", tempDir)).toBeNull();
  });
});
