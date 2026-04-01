import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { scoreStory } from "../core/quality-scorer.js";
import { hasPendingStories } from "../core/io-helpers.js";
import { logEvents, readTrace } from "../core/event-logger.js";
import { createWorktree } from "../core/worktree.js";
import { read } from "../store/state-store.js";

describe("quality-scorer: git diff --stat regex", () => {
  const regex = /(\d+) insertion.+?(\d+) deletion/;

  it("parses standard insertions/deletions", () => {
    const line = " 5 files changed, 120 insertions(+), 45 deletions(-)";
    const match = line.match(regex);
    expect(match).not.toBeNull();
    expect(parseInt(match[1])).toBe(120);
    expect(parseInt(match[2])).toBe(45);
  });

  it("parses singular insertion/deletion", () => {
    const line = " 1 file changed, 1 insertion(+), 1 deletion(-)";
    const match = line.match(regex);
    expect(match).not.toBeNull();
    expect(parseInt(match[1])).toBe(1);
    expect(parseInt(match[2])).toBe(1);
  });

  it("parses large numbers", () => {
    const line = " 42 files changed, 1523 insertions(+), 892 deletions(-)";
    const match = line.match(regex);
    expect(match).not.toBeNull();
    expect(parseInt(match[1])).toBe(1523);
    expect(parseInt(match[2])).toBe(892);
  });

  it("handles insertions only (no deletions) — no match", () => {
    const line = " 3 files changed, 50 insertions(+)";
    const match = line.match(regex);
    expect(match).toBeNull();
  });

  it("handles deletions only (no insertions) — no match", () => {
    const line = " 2 files changed, 30 deletions(-)";
    const match = line.match(regex);
    expect(match).toBeNull();
  });
});

describe("scoreStory: edge cases", () => {
  it("handles completely empty results", () => {
    const result = scoreStory({});
    expect(result.score).toBe(0);
    expect(result.grade).toBe("F");
  });

  it("handles negative values (clamped to 0)", () => {
    const result = scoreStory({ tests: -5 });
    expect(result.breakdown.tests).toBe(0);
  });

  it("handles values exceeding max (clamped to max)", () => {
    const result = scoreStory({ tests: 999 });
    expect(result.breakdown.tests).toBe(10);
  });
});

describe("io-helpers: EACCES error propagation", () => {
  it("hasPendingStories throws on permission error (non-ENOENT)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "err-test-"));
    const prdPath = join(dir, "prd.json");
    await writeFile(prdPath, '{"userStories":[]}', "utf-8");
    await chmod(prdPath, 0o000);
    try {
      await expect(hasPendingStories(dir)).rejects.toThrow();
    } finally {
      await chmod(prdPath, 0o644);
      await rm(dir, { recursive: true });
    }
  });
});

describe("event-logger: resilience", () => {
  it("logEvents does not throw on any error", async () => {
    await expect(logEvents([{ event: "test" }], {}, "/proc/nonexistent")).resolves.toBeUndefined();
  });

  it("readTrace returns empty for corrupted file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trace-err-"));
    const { mkdir, writeFile: wf } = await import("node:fs/promises");
    await mkdir(join(dir, ".loophaus"), { recursive: true });
    await wf(join(dir, ".loophaus", "trace.jsonl"), "NOT{JSON\nALSO{BAD\n", "utf-8");
    const trace = await readTrace(dir);
    expect(trace).toEqual([]);
    await rm(dir, { recursive: true });
  });
});

describe("worktree: input validation errors", () => {
  it("rejects null/undefined name", async () => {
    await expect(createWorktree(null)).rejects.toThrow("name is required");
  });

  it("rejects command injection attempt", async () => {
    await expect(createWorktree("$(whoami)")).rejects.toThrow("invalid characters");
  });

  it("rejects backtick injection", async () => {
    await expect(createWorktree("`whoami`")).rejects.toThrow("invalid characters");
  });
});

describe("state-store: corrupted state handling", () => {
  it("returns default state for corrupted JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "state-err-"));
    const { mkdir: mk, writeFile: wf } = await import("node:fs/promises");
    await mk(join(dir, ".loophaus"), { recursive: true });
    await wf(join(dir, ".loophaus", "state.json"), "NOT VALID JSON", "utf-8");
    const state = await read(dir);
    expect(state.active).toBe(false);
    await rm(dir, { recursive: true });
  });
});
