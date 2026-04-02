import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const scriptPath = join(projectRoot, "scripts", "setup-loop.mjs");

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "loophaus-setup-script-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  delete process.env.LOOPHAUS_STATE_FILE;
});

describe("setup-loop script", () => {
  it("writes active loop state using Node entrypoint", async () => {
    const statePath = join(tempDir, "state.json");
    const { stdout } = await execFileAsync("node", [
      scriptPath,
      "Implement",
      "Windows",
      "support",
      "--max-iterations",
      "7",
      "--completion-promise",
      "DONE",
    ], {
      cwd: projectRoot,
      env: { ...process.env, LOOPHAUS_STATE_FILE: statePath },
    });

    const raw = await readFile(statePath, "utf-8");
    const state = JSON.parse(raw);

    expect(stdout).toContain("Loop activated!");
    expect(state.active).toBe(true);
    expect(state.prompt).toBe("Implement Windows support");
    expect(state.maxIterations).toBe(7);
    expect(state.completionPromise).toBe("DONE");
    expect(state.currentIteration).toBe(0);
  });

  it("fails when no prompt is provided", async () => {
    await expect(execFileAsync("node", [scriptPath], {
      cwd: projectRoot,
      env: { ...process.env, LOOPHAUS_STATE_FILE: join(tempDir, "state.json") },
    })).rejects.toThrow(/No prompt provided/);
  });
});
