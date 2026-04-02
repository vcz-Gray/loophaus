import { describe, it, expect, afterEach } from "vitest";
import { sep } from "node:path";
import { homedir } from "node:os";
import {
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getLoophausHome,
  getAgentsHome,
  getAgentsSkillsDir,
  isWindows,
  getPackageVersion,
  getLocalCodexDir,
  getLocalPluginDir,
  getLocalHooksJsonPath,
  getLocalSkillsDir,
  getClaudeHome,
  getClaudePluginsDir,
  getClaudePluginCacheDir,
  getClaudeSettingsPath,
  getClaudeInstalledPluginsPath,
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

  it("getLoophausHome uses provided home dir", () => {
    expect(getLoophausHome("/custom/home")).toMatch(/custom[/\\]home[/\\]\.loophaus$/);
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

  it("getPackageVersion returns a semver string", () => {
    const v = getPackageVersion();
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("getLocalCodexDir is relative to cwd", () => {
    expect(getLocalCodexDir()).toContain(".codex");
  });

  it("getLocalPluginDir includes loophaus", () => {
    expect(getLocalPluginDir()).toContain("loophaus");
  });

  it("getLocalHooksJsonPath ends with hooks.json", () => {
    expect(getLocalHooksJsonPath()).toMatch(/hooks\.json$/);
  });

  it("getLocalSkillsDir ends with skills", () => {
    expect(getLocalSkillsDir()).toMatch(/skills$/);
  });

  it("getClaudeHome returns ~/.claude", () => {
    expect(getClaudeHome()).toContain(".claude");
    expect(getClaudeHome().startsWith(homedir())).toBe(true);
  });

  it("getClaudePluginsDir includes plugins", () => {
    expect(getClaudePluginsDir()).toContain("plugins");
  });

  it("getClaudePluginCacheDir includes version", () => {
    const dir = getClaudePluginCacheDir("1.2.3");
    expect(dir).toContain("1.2.3");
    expect(dir).toContain("loophaus");
  });

  it("getClaudeSettingsPath ends with settings.json", () => {
    expect(getClaudeSettingsPath()).toMatch(/settings\.json$/);
  });

  it("getClaudeInstalledPluginsPath ends with installed_plugins.json", () => {
    expect(getClaudeInstalledPluginsPath()).toMatch(/installed_plugins\.json$/);
  });
});
