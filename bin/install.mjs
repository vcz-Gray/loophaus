#!/usr/bin/env node

import {
  readFile,
  writeFile,
  mkdir,
  cp,
  readdir,
  access,
} from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isWindows,
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getLocalCodexDir,
  getLocalPluginDir,
  getLocalHooksJsonPath,
  getLocalSkillsDir,
} from "../lib/paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceFlag = args.includes("--force");
const localMode = args.includes("--local");
const showHelp = args.includes("--help") || args.includes("-h");
const uninstallMode = args.includes("uninstall");

if (showHelp) {
  console.log(`ralph-codex installer

Usage:
  node bin/install.mjs [options]
  npx ralph-codex install [options]

Options:
  --global      Install to ~/.codex/ (default)
  --local       Install to .codex/ in current project
  --dry-run     Show what would be done without making changes
  --force       Overwrite existing installation without prompting
  --help, -h    Show this help message

  uninstall     Remove ralph-codex from Codex CLI
`);
  process.exit(0);
}

if (uninstallMode) {
  const { uninstall } = await import("./uninstall.mjs");
  await uninstall({ dryRun, local: localMode });
  process.exit(0);
}

// Determine target paths based on mode
const codexHome = localMode ? getLocalCodexDir() : getCodexHome();
const pluginDir = localMode ? getLocalPluginDir() : getPluginInstallDir();
const hooksJsonPath = localMode ? getLocalHooksJsonPath() : getHooksJsonPath();
const skillsDir = localMode ? getLocalSkillsDir() : getSkillsDir();

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

async function copyPluginFiles() {
  const dirs = ["hooks", "commands", "lib"];
  for (const dir of dirs) {
    const src = join(PROJECT_ROOT, dir);
    const dest = join(pluginDir, dir);
    log(">", `Copy ${dir}/ -> ${dest}`);
    if (!dryRun) {
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  }
  // Copy package.json for version tracking
  const pkgSrc = join(PROJECT_ROOT, "package.json");
  const pkgDest = join(pluginDir, "package.json");
  log(">", `Copy package.json -> ${pkgDest}`);
  if (!dryRun) {
    await cp(pkgSrc, pkgDest);
  }
}

async function mergeHooksJson() {
  const stopHookCommand = `node "${join(pluginDir, "hooks", "stop-hook.mjs")}"`;

  const newEntry = {
    hooks: [
      {
        type: "command",
        command: stopHookCommand,
        timeout: 30,
      },
    ],
  };

  let existing = { hooks: {} };
  if (await fileExists(hooksJsonPath)) {
    try {
      const raw = await readFile(hooksJsonPath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      log("!", `Warning: existing hooks.json is malformed, creating fresh`);
      existing = { hooks: {} };
    }
  }

  if (!existing.hooks) {
    existing.hooks = {};
  }
  if (!Array.isArray(existing.hooks.Stop)) {
    existing.hooks.Stop = [];
  }

  // Remove any existing ralph-codex entries
  existing.hooks.Stop = existing.hooks.Stop.filter((entry) => {
    const cmds = entry.hooks || [];
    return !cmds.some(
      (h) => h.command && h.command.includes(RALPH_HOOK_MARKER),
    );
  });

  // Add our entry
  existing.hooks.Stop.push(newEntry);

  log(">", `Merge Stop hook into ${hooksJsonPath}`);
  log(" ", `Command: ${stopHookCommand}`);

  if (!dryRun) {
    await mkdir(dirname(hooksJsonPath), { recursive: true });
    await writeFile(hooksJsonPath, JSON.stringify(existing, null, 2), "utf-8");
  }
}

async function installSkills() {
  // Command-based skills (ralph-loop, cancel-ralph)
  const commandSkills = ["ralph-loop", "cancel-ralph"];
  for (const name of commandSkills) {
    const skillDir = join(skillsDir, name);
    const skillMd = join(skillDir, "SKILL.md");

    log(">", `Install skill: ${name} -> ${skillDir}`);

    if (!dryRun) {
      await mkdir(skillDir, { recursive: true });

      const content = await readFile(
        join(PROJECT_ROOT, "commands", `${name}.md`),
        "utf-8",
      );

      const resolved = content.replaceAll("${RALPH_CODEX_ROOT}", pluginDir);
      await writeFile(skillMd, resolved, "utf-8");
    }
  }

  // Standalone skills (ralph-interview, etc.)
  const standaloneSkills = ["ralph-interview", "ralph-orchestrator"];
  for (const name of standaloneSkills) {
    const srcDir = join(PROJECT_ROOT, "skills", name);
    const destDir = join(skillsDir, name);

    log(">", `Install skill: ${name} -> ${destDir}`);

    if (!dryRun) {
      await mkdir(destDir, { recursive: true });
      await cp(srcDir, destDir, { recursive: true });
    }
  }
}

async function main() {
  console.log("");
  console.log(`ralph-codex installer${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Mode: ${localMode ? "local (.codex/)" : "global (~/.codex/)"}`);
  console.log(`Target: ${pluginDir}`);
  console.log("");

  // Check for existing installation
  if (!forceFlag && (await fileExists(pluginDir))) {
    if (dryRun) {
      log("!", "Existing installation found (would prompt for --force)");
    } else {
      log("!", "Existing installation found. Use --force to overwrite.");
      process.exit(1);
    }
  }

  // Step 1: Copy plugin files
  console.log("[1/3] Copying plugin files...");
  await copyPluginFiles();

  // Step 2: Merge hooks.json
  console.log("[2/3] Configuring Stop hook...");
  await mergeHooksJson();

  // Step 3: Install skills (slash commands)
  console.log("[3/3] Installing skills...");
  await installSkills();

  console.log("");
  if (dryRun) {
    log("\u2714", "Dry run complete. No files were modified.");
  } else {
    log("\u2714", "ralph-codex installed successfully!");
    console.log("");
    console.log("  Usage in Codex CLI:");
    console.log(
      '    /ralph-loop "Build a REST API" --max-iterations 20 --completion-promise "DONE"',
    );
    console.log("    /cancel-ralph");
    console.log("");
    console.log("  To uninstall:");
    console.log("    node bin/uninstall.mjs" + (localMode ? " --local" : ""));
  }
  console.log("");
}

main().catch((err) => {
  console.error(`\u2718 Installation failed: ${err.message}`);
  process.exit(1);
});
