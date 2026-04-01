#!/usr/bin/env node

import { readFile, writeFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import {
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getLocalHooksJsonPath,
  getLocalPluginDir,
  getLocalSkillsDir,
  getClaudePluginCacheDir,
  getClaudeSettingsPath,
  getClaudeInstalledPluginsPath,
  getAgentsSkillsDir,
} from "../lib/paths.js";
import { getStatePath } from "../store/state-store.js";

const RALPH_HOOK_MARKER = "loophaus";

interface HookEntry {
  hooks?: Array<{ command?: string }>;
}

interface HooksConfig {
  hooks?: {
    Stop?: HookEntry[];
  };
}

interface PluginsData {
  plugins?: Record<string, unknown>;
}

interface SettingsData {
  enabledPlugins?: Record<string, unknown>;
}

function log(icon: string, msg: string): void {
  console.log(`  ${icon} ${msg}`);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

interface UninstallClaudeOptions {
  dryRun?: boolean;
}

async function uninstallClaude({ dryRun = false }: UninstallClaudeOptions = {}): Promise<void> {
  console.log("");
  console.log(
    `loophaus uninstaller — Claude Code${dryRun ? " (DRY RUN)" : ""}`,
  );
  console.log("");

  // 1. Remove plugin cache directory
  const cacheDir = getClaudePluginCacheDir();
  if (await fileExists(cacheDir)) {
    log(">", `Remove plugin cache: ${cacheDir}`);
    if (!dryRun) {
      await rm(cacheDir, { recursive: true, force: true });
    }
  } else {
    log("-", "Plugin cache not found");
  }

  // 2. Remove from installed_plugins.json
  const installedPluginsPath = getClaudeInstalledPluginsPath();
  if (await fileExists(installedPluginsPath)) {
    try {
      const raw = await readFile(installedPluginsPath, "utf-8");
      const data = JSON.parse(raw) as PluginsData;
      const pluginKey = "loophaus@loophaus-marketplace";
      if (data.plugins && data.plugins[pluginKey]) {
        delete data.plugins[pluginKey];
        log(">", `Remove ${pluginKey} from installed_plugins.json`);
        if (!dryRun) {
          await writeFile(
            installedPluginsPath,
            JSON.stringify(data, null, 2),
            "utf-8",
          );
        }
      } else {
        log("-", "Plugin not found in installed_plugins.json");
      }
    } catch {
      log("!", "Warning: could not parse installed_plugins.json");
    }
  }

  // 3. Remove from settings.json
  const settingsPath = getClaudeSettingsPath();
  if (await fileExists(settingsPath)) {
    try {
      const raw = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(raw) as SettingsData;
      const pluginKey = "loophaus@loophaus-marketplace";
      if (
        settings.enabledPlugins &&
        settings.enabledPlugins[pluginKey] !== undefined
      ) {
        delete settings.enabledPlugins[pluginKey];
        log(">", `Disable ${pluginKey} in settings.json`);
        if (!dryRun) {
          await writeFile(
            settingsPath,
            JSON.stringify(settings, null, 2),
            "utf-8",
          );
        }
      }
    } catch {
      log("!", "Warning: could not parse settings.json");
    }
  }

  console.log("");
  if (dryRun) {
    log("\u2714", "Dry run complete. No files were modified.");
  } else {
    log("\u2714", "loophaus uninstalled from Claude Code.");
    console.log("");
    console.log("  Run /reload-plugins in Claude Code to apply.");
  }
  console.log("");
}

export interface UninstallOptions {
  dryRun?: boolean;
  local?: boolean;
  claude?: boolean;
}

export async function uninstall({
  dryRun = false,
  local = false,
  claude = false,
}: UninstallOptions = {}): Promise<void> {
  if (claude) {
    return uninstallClaude({ dryRun });
  }

  const pluginDir = local ? getLocalPluginDir() : getPluginInstallDir();
  const hooksJsonPath = local ? getLocalHooksJsonPath() : getHooksJsonPath();
  const skillsDir = local ? getLocalSkillsDir() : getSkillsDir();

  console.log("");
  console.log(
    `loophaus uninstaller — Codex CLI${dryRun ? " (DRY RUN)" : ""}`,
  );
  console.log("");

  // 1. Remove ralph-codex entries from hooks.json
  if (await fileExists(hooksJsonPath)) {
    try {
      const raw = await readFile(hooksJsonPath, "utf-8");
      const config = JSON.parse(raw) as HooksConfig;

      if (config.hooks && Array.isArray(config.hooks.Stop)) {
        const before = config.hooks.Stop.length;
        config.hooks.Stop = config.hooks.Stop.filter((entry: HookEntry) => {
          const cmds = entry.hooks || [];
          return !cmds.some(
            (h) => h.command && h.command.includes(RALPH_HOOK_MARKER),
          );
        });
        const removed = before - config.hooks.Stop.length;

        if (removed > 0) {
          log(">", `Remove ${removed} Stop hook entry from ${hooksJsonPath}`);
          if (!dryRun) {
            await writeFile(
              hooksJsonPath,
              JSON.stringify(config, null, 2),
              "utf-8",
            );
          }
        } else {
          log("-", "No loophaus hooks found in hooks.json");
        }
      }
    } catch {
      log("!", `Warning: could not parse ${hooksJsonPath}`);
    }
  } else {
    log("-", "No hooks.json found");
  }

  // 2. Remove plugin directory
  if (await fileExists(pluginDir)) {
    log(">", `Remove plugin directory: ${pluginDir}`);
    if (!dryRun) {
      await rm(pluginDir, { recursive: true, force: true });
    }
  } else {
    log("-", "Plugin directory not found");
  }

  // 3. Remove skill directories (both legacy ralph-* and new loop-* names)
  const skillNames: string[] = [
    // New skill names
    "loop",
    "loop-stop",
    "loop-plan",
    "loop-pulse",
    // Legacy skill names
    "ralph-loop",
    "cancel-ralph",
    "ralph-interview",
    "ralph-orchestrator",
    "ralph-claude-interview",
    "ralph-claude-loop",
    "ralph-claude-cancel",
    "ralph-claude-orchestrator",
  ];
  for (const name of skillNames) {
    const skillDir = join(skillsDir, name);
    if (await fileExists(skillDir)) {
      log(">", `Remove skill: ${skillDir}`);
      if (!dryRun) {
        await rm(skillDir, { recursive: true, force: true });
      }
    }
  }

  // 3b. Remove skills from ~/.agents/skills/ (new Codex CLI standard path)
  if (!local) {
    const agentsSkillsDir = getAgentsSkillsDir();
    const agentsSkillNames: string[] = ["loop", "loop-stop", "loop-plan", "loop-pulse"];
    for (const name of agentsSkillNames) {
      const skillDir = join(agentsSkillsDir, name);
      if (await fileExists(skillDir)) {
        log(">", `Remove agents skill: ${skillDir}`);
        if (!dryRun) {
          await rm(skillDir, { recursive: true, force: true });
        }
      }
    }
  }

  // 4. Remove state file
  const statePath = getStatePath();
  if (await fileExists(statePath)) {
    log(">", `Remove state file: ${statePath}`);
    if (!dryRun) {
      await rm(statePath, { force: true });
    }
  }

  console.log("");
  if (dryRun) {
    log("\u2714", "Dry run complete. No files were modified.");
  } else {
    log("\u2714", "loophaus uninstalled successfully.");
  }
  console.log("");
}

// Run directly if not imported
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("uninstall.mjs") ||
    process.argv[1].endsWith("uninstall.js") ||
    process.argv[1].endsWith("uninstall"));

if (isDirectRun) {
  const cliArgs = process.argv.slice(2);
  const dryRun = cliArgs.includes("--dry-run");
  const local = cliArgs.includes("--local");
  const claude = cliArgs.includes("--claude");

  uninstall({ dryRun, local, claude }).catch((err: Error) => {
    console.error(`\u2718 Uninstall failed: ${err.message}`);
    process.exit(1);
  });
}
