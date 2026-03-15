import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readFile,
  rm,
  mkdtemp,
  mkdir,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const installScript = join(projectRoot, "bin", "install.mjs");

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ralph-install-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("install.mjs", () => {
  it("--dry-run produces no file changes", async () => {
    const codexHome = join(tempDir, ".codex");
    const { stdout } = await execFileAsync(
      "node",
      [installScript, "--dry-run"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    expect(stdout).toContain("DRY RUN");
    expect(stdout).toContain("Dry run complete");
    // No files should have been created
    expect(await fileExists(join(codexHome, "plugins", "ralph-codex"))).toBe(
      false,
    );
  });

  it("--global --force installs files correctly", async () => {
    const codexHome = join(tempDir, ".codex");
    const { stdout } = await execFileAsync(
      "node",
      [installScript, "--global", "--force"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    expect(stdout).toContain("installed successfully");
    // Plugin dir should exist
    expect(
      await fileExists(
        join(codexHome, "plugins", "ralph-codex", "hooks", "stop-hook.mjs"),
      ),
    ).toBe(true);
    expect(
      await fileExists(
        join(codexHome, "plugins", "ralph-codex", "lib", "state.mjs"),
      ),
    ).toBe(true);
    // hooks.json should exist
    expect(await fileExists(join(codexHome, "hooks.json"))).toBe(true);
    const hooksJson = JSON.parse(
      await readFile(join(codexHome, "hooks.json"), "utf-8"),
    );
    expect(hooksJson.hooks.Stop).toHaveLength(1);
    expect(hooksJson.hooks.Stop[0].hooks[0].command).toContain("ralph-codex");
    // Skills should exist
    expect(
      await fileExists(join(codexHome, "skills", "ralph-loop", "SKILL.md")),
    ).toBe(true);
    expect(
      await fileExists(join(codexHome, "skills", "cancel-ralph", "SKILL.md")),
    ).toBe(true);
  });

  it("hooks.json merge preserves existing hooks", async () => {
    const codexHome = join(tempDir, ".codex");
    await mkdir(codexHome, { recursive: true });
    // Create existing hooks.json with another hook
    const existingHooks = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "echo other-hook" }] }],
        SessionStart: [
          { hooks: [{ type: "command", command: "echo session-start" }] },
        ],
      },
    };
    await writeFile(
      join(codexHome, "hooks.json"),
      JSON.stringify(existingHooks),
      "utf-8",
    );

    await execFileAsync("node", [installScript, "--global", "--force"], {
      env: { ...process.env, CODEX_HOME: codexHome },
      cwd: projectRoot,
    });

    const hooksJson = JSON.parse(
      await readFile(join(codexHome, "hooks.json"), "utf-8"),
    );
    // Should have existing + ralph-codex
    expect(hooksJson.hooks.Stop).toHaveLength(2);
    expect(hooksJson.hooks.Stop[0].hooks[0].command).toBe("echo other-hook");
    expect(hooksJson.hooks.Stop[1].hooks[0].command).toContain("ralph-codex");
    // SessionStart should be preserved
    expect(hooksJson.hooks.SessionStart).toHaveLength(1);
  });

  it("refuses to overwrite without --force", async () => {
    const codexHome = join(tempDir, ".codex");
    // First install
    await execFileAsync("node", [installScript, "--global", "--force"], {
      env: { ...process.env, CODEX_HOME: codexHome },
      cwd: projectRoot,
    });
    // Second install without --force should fail
    try {
      await execFileAsync("node", [installScript, "--global"], {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err.stdout).toContain("Use --force");
    }
  });
});
