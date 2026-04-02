import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readConfig, writeConfig,
  cleanTraces, cleanResults, cleanSessions, cleanAll,
  archiveCurrentData, applyOnNewPlanPolicy,
} from "../core/cleanup.js";

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cleanup-test-"));
  await mkdir(join(dir, ".loophaus"), { recursive: true });
});

describe("readConfig / writeConfig", () => {
  it("returns defaults when no config exists", async () => {
    const config = await readConfig(dir);
    expect(config.cleanup.onNewPlan).toBe("keep");
    expect(config.cleanup.traceRetentionDays).toBe(30);
    expect(config.cleanup.sessionRetentionDays).toBe(7);
  });

  it("roundtrips config", async () => {
    const config = { cleanup: { onNewPlan: "archive", traceRetentionDays: 14, sessionRetentionDays: 3 } };
    await writeConfig(config, dir);
    const read = await readConfig(dir);
    expect(read.cleanup.onNewPlan).toBe("archive");
    expect(read.cleanup.traceRetentionDays).toBe(14);
  });
});

describe("cleanTraces", () => {
  it("removes trace.jsonl", async () => {
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "data\n");
    const result = await cleanTraces(dir);
    expect(result.removed).toContain("trace.jsonl");
  });

  it("skips when no trace exists", async () => {
    const result = await cleanTraces(dir);
    expect(result.skipped).toContain("trace.jsonl");
  });
});

describe("cleanResults", () => {
  it("removes results.tsv", async () => {
    await writeFile(join(dir, ".loophaus", "results.tsv"), "data\n");
    const result = await cleanResults(dir);
    expect(result.removed).toContain("results.tsv");
  });
});

describe("cleanSessions", () => {
  it("removes all session files", async () => {
    await mkdir(join(dir, ".loophaus", "sessions"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "sessions", "s1.json"), "{}");
    await writeFile(join(dir, ".loophaus", "sessions", "s2.json"), "{}");
    const result = await cleanSessions({ cwd: dir });
    expect(result.removed).toHaveLength(2);
  });

  it("respects --before date filter", async () => {
    await mkdir(join(dir, ".loophaus", "sessions"), { recursive: true });
    const oldFile = join(dir, ".loophaus", "sessions", "old.json");
    const newFile = join(dir, ".loophaus", "sessions", "new.json");
    await writeFile(oldFile, "{}");
    await writeFile(newFile, "{}");
    // Set old file to past
    const { utimes } = await import("node:fs/promises");
    const past = new Date("2020-01-01");
    await utimes(oldFile, past, past);

    const result = await cleanSessions({ cwd: dir, before: new Date("2025-01-01") });
    expect(result.removed).toContain("old.json");
    expect(result.skipped).toContain("new.json");
  });

  it("handles missing sessions directory", async () => {
    const result = await cleanSessions({ cwd: dir });
    expect(result.removed).toHaveLength(0);
  });
});

describe("cleanAll", () => {
  it("cleans everything but benchmark.tsv", async () => {
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "data\n");
    await writeFile(join(dir, ".loophaus", "results.tsv"), "data\n");
    await writeFile(join(dir, ".loophaus", "benchmark.tsv"), "protected\n");
    const result = await cleanAll(dir);
    expect(result.removed).toContain("trace.jsonl");
    expect(result.removed).toContain("results.tsv");
    expect(result.skipped).toContainEqual(expect.stringContaining("benchmark.tsv"));

    // Verify benchmark.tsv still exists
    const content = await readFile(join(dir, ".loophaus", "benchmark.tsv"), "utf-8");
    expect(content).toBe("protected\n");
  });
});

describe("archiveCurrentData", () => {
  it("moves trace + results to archive/{date}/", async () => {
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "trace-data\n");
    await writeFile(join(dir, ".loophaus", "results.tsv"), "results-data\n");
    const result = await archiveCurrentData(dir);
    expect(result.archived).toHaveLength(2);

    const archiveEntries = await readdir(join(dir, ".loophaus", "archive"));
    expect(archiveEntries).toHaveLength(1);

    const dateDir = archiveEntries[0];
    const archived = await readdir(join(dir, ".loophaus", "archive", dateDir));
    expect(archived).toContain("trace.jsonl");
    expect(archived).toContain("results.tsv");
  });

  it("archives sessions too", async () => {
    await mkdir(join(dir, ".loophaus", "sessions"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "sessions", "s1.json"), "{}");
    const result = await archiveCurrentData(dir);
    expect(result.archived.some(a => a.includes("sessions/"))).toBe(true);
  });

  it("skips files that don't exist", async () => {
    const result = await archiveCurrentData(dir);
    expect(result.skipped).toContain("trace.jsonl");
    expect(result.skipped).toContain("results.tsv");
  });
});

describe("applyOnNewPlanPolicy", () => {
  it("does nothing with 'keep' policy (default)", async () => {
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "data\n");
    const result = await applyOnNewPlanPolicy(dir);
    expect(result.skipped).toContainEqual(expect.stringContaining("keep"));
    // trace still exists
    const content = await readFile(join(dir, ".loophaus", "trace.jsonl"), "utf-8");
    expect(content).toBe("data\n");
  });

  it("archives with 'archive' policy", async () => {
    await writeConfig({ cleanup: { onNewPlan: "archive", traceRetentionDays: 30, sessionRetentionDays: 7 } }, dir);
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "data\n");
    const result = await applyOnNewPlanPolicy(dir);
    expect(result.archived.length).toBeGreaterThan(0);
  });

  it("deletes with 'delete' policy", async () => {
    await writeConfig({ cleanup: { onNewPlan: "delete", traceRetentionDays: 30, sessionRetentionDays: 7 } }, dir);
    await writeFile(join(dir, ".loophaus", "trace.jsonl"), "data\n");
    const result = await applyOnNewPlanPolicy(dir);
    expect(result.removed).toContain("trace.jsonl");
  });
});
