import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _cachedVersion: string | null = null;
export function getPackageVersion(): string {
  if (_cachedVersion) return _cachedVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
    ) as { version: string };
    _cachedVersion = pkg.version;
  } catch {
    _cachedVersion = "0.0.0";
  }
  return _cachedVersion;
}

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function getLoophausHome(homeDir?: string): string {
  return join(homeDir || homedir(), ".loophaus");
}

// --- Codex CLI paths (legacy ~/.codex + new ~/.agents) ---

export function getCodexHome(): string {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }
  return join(homedir(), ".codex");
}

export function getAgentsHome(): string {
  return join(homedir(), ".agents");
}

export function getAgentsSkillsDir(): string {
  return join(getAgentsHome(), "skills");
}

export function getHooksJsonPath(): string {
  return join(getCodexHome(), "hooks.json");
}

export function getPluginInstallDir(): string {
  return join(getCodexHome(), "plugins", "loophaus");
}

export function getSkillsDir(): string {
  return join(getCodexHome(), "skills");
}

export function getLocalCodexDir(): string {
  return join(process.cwd(), ".codex");
}

export function getLocalPluginDir(): string {
  return join(getLocalCodexDir(), "plugins", "loophaus");
}

export function getLocalHooksJsonPath(): string {
  return join(getLocalCodexDir(), "hooks.json");
}

export function getLocalSkillsDir(): string {
  return join(getLocalCodexDir(), "skills");
}

// --- Claude Code paths ---

export function getClaudeHome(): string {
  return join(homedir(), ".claude");
}

export function getClaudePluginsDir(): string {
  return join(getClaudeHome(), "plugins");
}

export function getClaudePluginCacheDir(version?: string): string {
  const v = version || getPackageVersion();
  return join(
    getClaudePluginsDir(),
    "cache",
    "loophaus-marketplace",
    "loophaus",
    v,
  );
}

export function getClaudeSettingsPath(): string {
  return join(getClaudeHome(), "settings.json");
}

export function getClaudeInstalledPluginsPath(): string {
  return join(getClaudePluginsDir(), "installed_plugins.json");
}
