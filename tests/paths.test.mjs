import { describe, it, expect, afterEach } from "vitest";
import { sep } from "node:path";
import { homedir } from "node:os";
import {
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getAgentsHome,
  getAgentsSkillsDir,
  isWindows,
} from "../lib/paths.js";

let originalCodexHome;

afterEach(() => {
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }
});

describe("paths.mjs", () => {
  it("getCodexHome returns ~/.codex by default", () => {
    originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    const result = getCodexHome();
    expect(result).toContain(".codex");
    expect(result.startsWith(homedir())).toBe(true);
  });

  it("getCodexHome respects CODEX_HOME env var", () => {
    originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = "/custom/codex/path";
    expect(getCodexHome()).toBe("/custom/codex/path");
  });

  it("getHooksJsonPath ends with hooks.json", () => {
    originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    expect(getHooksJsonPath()).toMatch(/hooks\.json$/);
  });

  it("getPluginInstallDir includes loophaus", () => {
    originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    expect(getPluginInstallDir()).toContain("loophaus");
  });

  it("getSkillsDir ends with skills", () => {
    originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    expect(getSkillsDir()).toMatch(/skills$/);
  });

  it("getAgentsHome returns ~/.agents", () => {
    const result = getAgentsHome();
    expect(result).toContain(".agents");
    expect(result.startsWith(homedir())).toBe(true);
  });

  it("getAgentsSkillsDir ends with skills", () => {
    const result = getAgentsSkillsDir();
    expect(result).toMatch(/\.agents[/\\]skills$/);
  });

  it("isWindows returns boolean", () => {
    expect(typeof isWindows()).toBe("boolean");
  });

  it("all paths use path.sep", () => {
    originalCodexHome = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    const paths = [getCodexHome(), getPluginInstallDir(), getSkillsDir()];
    for (const p of paths) {
      expect(p).toContain(sep);
    }
  });
});
