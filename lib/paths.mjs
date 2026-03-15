import { homedir } from "node:os";
import { join } from "node:path";

export function isWindows() {
  return process.platform === "win32";
}

export function getCodexHome() {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }
  return join(homedir(), ".codex");
}

export function getHooksJsonPath() {
  return join(getCodexHome(), "hooks.json");
}

export function getPluginInstallDir() {
  return join(getCodexHome(), "plugins", "ralph-codex");
}

export function getSkillsDir() {
  return join(getCodexHome(), "skills");
}

export function getLocalCodexDir() {
  return join(process.cwd(), ".codex");
}

export function getLocalPluginDir() {
  return join(getLocalCodexDir(), "plugins", "ralph-codex");
}

export function getLocalHooksJsonPath() {
  return join(getLocalCodexDir(), "hooks.json");
}

export function getLocalSkillsDir() {
  return join(getLocalCodexDir(), "skills");
}
