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
} from "../lib/paths.mjs";
import { getStatePath } from "../lib/state.mjs";

const RALPH_HOOK_MARKER = "ralph-codex";

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function uninstall({ dryRun = false, local = false } = {}) {
  const pluginDir = local ? getLocalPluginDir() : getPluginInstallDir();
  const hooksJsonPath = local ? getLocalHooksJsonPath() : getHooksJsonPath();
  const skillsDir = local ? getLocalSkillsDir() : getSkillsDir();

  console.log("");
  console.log(`ralph-codex uninstaller${dryRun ? " (DRY RUN)" : ""}`);
  console.log("");

  // 1. Remove ralph-codex entries from hooks.json
  if (await fileExists(hooksJsonPath)) {
    try {
      const raw = await readFile(hooksJsonPath, "utf-8");
      const config = JSON.parse(raw);

      if (config.hooks && Array.isArray(config.hooks.Stop)) {
        const before = config.hooks.Stop.length;
        config.hooks.Stop = config.hooks.Stop.filter((entry) => {
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
          log("-", "No ralph-codex hooks found in hooks.json");
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

  // 3. Remove skill directories
  const skillNames = ["ralph-loop", "cancel-ralph"];
  for (const name of skillNames) {
    const skillDir = join(skillsDir, name);
    if (await fileExists(skillDir)) {
      log(">", `Remove skill: ${skillDir}`);
      if (!dryRun) {
        await rm(skillDir, { recursive: true, force: true });
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
    log("\u2714", "ralph-codex uninstalled successfully.");
  }
  console.log("");
}

// Run directly if not imported
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("uninstall.mjs") ||
    process.argv[1].endsWith("uninstall"));

if (isDirectRun) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const local = args.includes("--local");

  uninstall({ dryRun, local }).catch((err) => {
    console.error(`\u2718 Uninstall failed: ${err.message}`);
    process.exit(1);
  });
}
