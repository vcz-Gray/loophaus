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
const cliScript = join(projectRoot, "bin", "loophaus.mjs");

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

describe("loophaus CLI", () => {
  it("--dry-run produces no file changes", async () => {
    const codexHome = join(tempDir, ".codex");
    const { stdout } = await execFileAsync(
      "node",
      [cliScript, "install", "--host", "codex-cli", "--dry-run"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    expect(stdout).toContain("DRY RUN");
    expect(stdout).toContain("Dry run complete");
    expect(await fileExists(join(codexHome, "plugins", "loophaus"))).toBe(
      false,
    );
  });

  it("install --host codex-cli --force installs files correctly", async () => {
    const codexHome = join(tempDir, ".codex");
    const { stdout } = await execFileAsync(
      "node",
      [cliScript, "install", "--host", "codex-cli", "--force"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    expect(stdout).toContain("loophaus installed for Codex CLI");
    expect(
      await fileExists(
        join(codexHome, "plugins", "loophaus", "hooks", "stop-hook.mjs"),
      ),
    ).toBe(true);
    expect(
      await fileExists(
        join(codexHome, "plugins", "loophaus", "lib", "state.mjs"),
      ),
    ).toBe(true);
    expect(await fileExists(join(codexHome, "hooks.json"))).toBe(true);
    const hooksJson = JSON.parse(
      await readFile(join(codexHome, "hooks.json"), "utf-8"),
    );
    expect(hooksJson.hooks.Stop).toHaveLength(1);
    expect(hooksJson.hooks.Stop[0].hooks[0].command).toContain("loophaus");
    // Skills installed to ~/.agents/skills/ (new standard path)
    const { getAgentsSkillsDir } = await import("../lib/paths.mjs");
    const agentsSkills = getAgentsSkillsDir();
    expect(
      await fileExists(join(agentsSkills, "loop", "SKILL.md")),
    ).toBe(true);
    expect(
      await fileExists(join(agentsSkills, "loop-stop", "SKILL.md")),
    ).toBe(true);
    // Legacy skills cleaned from ~/.codex/skills/
    expect(
      await fileExists(join(codexHome, "skills", "ralph-loop", "SKILL.md")),
    ).toBe(false);
    expect(
      await fileExists(join(codexHome, "skills", "loop", "SKILL.md")),
    ).toBe(false);
  });

  it("hooks.json merge preserves existing hooks", async () => {
    const codexHome = join(tempDir, ".codex");
    await mkdir(codexHome, { recursive: true });
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

    await execFileAsync(
      "node",
      [cliScript, "install", "--host", "codex-cli", "--force"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );

    const hooksJson = JSON.parse(
      await readFile(join(codexHome, "hooks.json"), "utf-8"),
    );
    expect(hooksJson.hooks.Stop).toHaveLength(2);
    expect(hooksJson.hooks.Stop[0].hooks[0].command).toBe("echo other-hook");
    expect(hooksJson.hooks.Stop[1].hooks[0].command).toContain("loophaus");
    expect(hooksJson.hooks.SessionStart).toHaveLength(1);
  });

  it("refuses to overwrite without --force", async () => {
    const codexHome = join(tempDir, ".codex");
    await execFileAsync(
      "node",
      [cliScript, "install", "--host", "codex-cli", "--force"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    const { stdout } = await execFileAsync(
      "node",
      [cliScript, "install", "--host", "codex-cli"],
      {
        env: { ...process.env, CODEX_HOME: codexHome },
        cwd: projectRoot,
      },
    );
    expect(stdout).toContain("Use --force");
  });
});
