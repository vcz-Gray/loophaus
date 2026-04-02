import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig } from "../core/cleanup.js";

describe("config roundtrip", () => {
  it("writes and reads nested config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-test-"));
    await writeConfig({ cleanup: { onNewPlan: "archive", traceRetentionDays: 14, sessionRetentionDays: 3 } }, dir);
    const config = await readConfig(dir);
    expect(config.cleanup.onNewPlan).toBe("archive");
    expect(config.cleanup.traceRetentionDays).toBe(14);
    await rm(dir, { recursive: true });
  });

  it("returns defaults for missing config", async () => {
    const config = await readConfig("/nonexistent");
    expect(config.cleanup.onNewPlan).toBe("keep");
    expect(config.cleanup.traceRetentionDays).toBe(30);
    expect(config.cleanup.sessionRetentionDays).toBe(7);
  });

  it("merges partial config with defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-test-"));
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(dir, ".loophaus"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "config.json"), JSON.stringify({ cleanup: { onNewPlan: "delete" } }));
    const config = await readConfig(dir);
    expect(config.cleanup.onNewPlan).toBe("delete");
    expect(config.cleanup.traceRetentionDays).toBe(30); // default preserved
    await rm(dir, { recursive: true });
  });

  it("handles corrupted JSON gracefully", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-test-"));
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(dir, ".loophaus"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "config.json"), "NOT JSON");
    const config = await readConfig(dir);
    expect(config.cleanup.onNewPlan).toBe("keep"); // fallback to defaults
    await rm(dir, { recursive: true });
  });

  it("preserves extra keys when writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "config-test-"));
    const { mkdir, writeFile, readFile } = await import("node:fs/promises");
    await mkdir(join(dir, ".loophaus"), { recursive: true });
    await writeFile(join(dir, ".loophaus", "config.json"), JSON.stringify({ updateCheck: true, cleanup: { onNewPlan: "keep", traceRetentionDays: 30, sessionRetentionDays: 7 } }));
    await writeConfig({ cleanup: { onNewPlan: "archive", traceRetentionDays: 14, sessionRetentionDays: 3 } }, dir);
    const raw = JSON.parse(await readFile(join(dir, ".loophaus", "config.json"), "utf-8"));
    expect(raw.cleanup.onNewPlan).toBe("archive");
    await rm(dir, { recursive: true });
  });
});
