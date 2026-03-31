import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _cachedVersion = null;
export function getPackageVersion() {
  if (_cachedVersion) return _cachedVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
    );
    _cachedVersion = pkg.version;
  } catch {
    _cachedVersion = "0.0.0";
  }
  return _cachedVersion;
}

export function isWindows() {
  return process.platform === "win32";
}

// --- Codex CLI paths (legacy ~/.codex + new ~/.agents) ---

export function getCodexHome() {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }
  return join(homedir(), ".codex");
}

export function getAgentsHome() {
  return join(homedir(), ".agents");
}

export function getAgentsSkillsDir() {
  return join(getAgentsHome(), "skills");
}

export function getHooksJsonPath() {
  return join(getCodexHome(), "hooks.json");
}

export function getPluginInstallDir() {
  return join(getCodexHome(), "plugins", "loophaus");
}

export function getSkillsDir() {
  return join(getCodexHome(), "skills");
}

export function getLocalCodexDir() {
  return join(process.cwd(), ".codex");
}

export function getLocalPluginDir() {
  return join(getLocalCodexDir(), "plugins", "loophaus");
}

export function getLocalHooksJsonPath() {
  return join(getLocalCodexDir(), "hooks.json");
}

export function getLocalSkillsDir() {
  return join(getLocalCodexDir(), "skills");
}

// --- Claude Code paths ---

export function getClaudeHome() {
  return join(homedir(), ".claude");
}

export function getClaudePluginsDir() {
  return join(getClaudeHome(), "plugins");
}

export function getClaudePluginCacheDir(version) {
  const v = version || getPackageVersion();
  return join(
    getClaudePluginsDir(),
    "cache",
    "loophaus-marketplace",
    "loophaus",
    v,
  );
}

export function getClaudeSettingsPath() {
  return join(getClaudeHome(), "settings.json");
}

export function getClaudeInstalledPluginsPath() {
  return join(getClaudePluginsDir(), "installed_plugins.json");
}
