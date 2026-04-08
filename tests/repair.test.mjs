import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile, stat, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// repair.ts uses process.cwd() to find .loophaus/ — we override it per test
let tmpDir;
let originalCwd;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "repair-test-"));
  originalCwd = process.cwd;
  process.cwd = () => tmpDir;
});

afterEach(async () => {
  process.cwd = originalCwd;
  await rm(tmpDir, { recursive: true, force: true });
});

function makeCtx(overrides = {}) {
  return {
    args: [],
    command: "repair",
    dryRun: false,
    force: false,
    local: false,
    verbose: false,
    getFlag: () => undefined,
    getNumericFlag: (_, d) => d,
    projectRoot: tmpDir,
    ...overrides,
  };
}

async function captureConsole(fn) {
  const lines = [];
  const origLog = console.log;
  console.log = (...args) => lines.push(args.join(" "));
  try {
    await fn();
  } finally {
    console.log = origLog;
  }
  return lines.join("\n");
}

describe("repair command", () => {
  it("reports healthy state when .loophaus/ is valid", async () => {
    const { run } = await import("../bin/commands/repair.js");
    const loophausDir = join(tmpDir, ".loophaus");
    await mkdir(loophausDir, { recursive: true });
    const validState = { active: false, prompt: "", maxIterations: 20, currentIteration: 0, schemaVersion: 2 };
    await writeFile(join(loophausDir, "state.json"), JSON.stringify(validState), "utf-8");
    await writeFile(join(loophausDir, "config.json"), JSON.stringify({ protocol_version: "1.0" }), "utf-8");

    const output = await captureConsole(() => run(makeCtx()));

    expect(output).toContain("healthy");
    expect(output).toContain("no issues found");
  });

  it("creates .loophaus/ when directory is missing", async () => {
    const { run } = await import("../bin/commands/repair.js");

    const output = await captureConsole(() => run(makeCtx()));

    expect(output).toContain(".loophaus/ directory not found");
    // Directory should have been created
    const s = await stat(join(tmpDir, ".loophaus"));
    expect(s.isDirectory()).toBe(true);
  });

  it("backs up and resets corrupted state.json", async () => {
    const { run } = await import("../bin/commands/repair.js");
    const loophausDir = join(tmpDir, ".loophaus");
    await mkdir(loophausDir, { recursive: true });
    await writeFile(join(loophausDir, "state.json"), "{{not valid json!!", "utf-8");

    const output = await captureConsole(() => run(makeCtx()));

    expect(output).toContain("invalid JSON");
    expect(output).toContain("reset to defaults");

    // Backup should exist
    const backup = await readFile(join(loophausDir, "state.json.bak"), "utf-8");
    expect(backup).toBe("{{not valid json!!");

    // New state should be valid JSON
    const newState = JSON.parse(await readFile(join(loophausDir, "state.json"), "utf-8"));
    expect(newState.active).toBe(false);
  });

  it("removes stale lock directories", async () => {
    const { run } = await import("../bin/commands/repair.js");
    const loophausDir = join(tmpDir, ".loophaus");
    await mkdir(loophausDir, { recursive: true });

    // Create a stale lock (old timestamp, dead PID)
    const lockDir = join(loophausDir, "state.json.lock");
    await mkdir(lockDir);
    await writeFile(join(lockDir, "pid"), JSON.stringify({ pid: 999999, ts: Date.now() - 120_000 }), "utf-8");

    const output = await captureConsole(() => run(makeCtx()));

    expect(output).toContain("Stale lock");
    expect(output).toContain("Removed stale lock");

    // Lock dir should be gone
    let lockExists = true;
    try {
      await stat(lockDir);
    } catch {
      lockExists = false;
    }
    expect(lockExists).toBe(false);
  });

  it("removes corrupted session checkpoints", async () => {
    const { run } = await import("../bin/commands/repair.js");
    const loophausDir = join(tmpDir, ".loophaus");
    const sessionsDir = join(loophausDir, "sessions");
    await mkdir(sessionsDir, { recursive: true });

    // Good session
    await writeFile(join(sessionsDir, "good.json"), JSON.stringify({ id: "good" }), "utf-8");
    // Bad session
    await writeFile(join(sessionsDir, "bad.json"), "not json{{{", "utf-8");

    const output = await captureConsole(() => run(makeCtx()));

    expect(output).toContain("Corrupted session checkpoint: bad.json");
    expect(output).toContain("Removed corrupted session: bad.json");

    // Good session should remain
    const remaining = await readdir(sessionsDir);
    expect(remaining).toContain("good.json");
    expect(remaining).not.toContain("bad.json");
  });

  it("respects --dry-run and does not modify files", async () => {
    const { run } = await import("../bin/commands/repair.js");
    const loophausDir = join(tmpDir, ".loophaus");
    await mkdir(loophausDir, { recursive: true });
    await writeFile(join(loophausDir, "state.json"), "broken json!", "utf-8");

    const output = await captureConsole(() => run(makeCtx({ dryRun: true })));

    expect(output).toContain("dry-run");

    // Original file should be unchanged
    const content = await readFile(join(loophausDir, "state.json"), "utf-8");
    expect(content).toBe("broken json!");
  });
});
