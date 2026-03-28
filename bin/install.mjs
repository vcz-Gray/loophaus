#!/usr/bin/env node

import {
  readFile,
  writeFile,
  mkdir,
  cp,
  access,
  chmod,
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
  getClaudeHome,
  getClaudePluginsDir,
  getClaudePluginCacheDir,
  getClaudeSettingsPath,
  getClaudeInstalledPluginsPath,
} from "../lib/paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceFlag = args.includes("--force");
const localMode = args.includes("--local");
const claudeMode = args.includes("--claude");
const showHelp = args.includes("--help") || args.includes("-h");
const uninstallMode = args.includes("uninstall");

if (showHelp) {
  console.log(`ralph-codex installer

Usage:
  npx @graypark/ralph-codex [options]

Options:
  --global      Install to ~/.codex/ for Codex CLI (default)
  --local       Install to .codex/ in current project for Codex CLI
  --claude      Install as Claude Code plugin to ~/.claude/
  --dry-run     Show what would be done without making changes
  --force       Overwrite existing installation without prompting
  --help, -h    Show this help message

  uninstall     Remove ralph-codex (add --claude for Claude Code)
`);
  process.exit(0);
}

if (uninstallMode) {
  const { uninstall } = await import("./uninstall.mjs");
  await uninstall({ dryRun, local: localMode, claude: claudeMode });
  process.exit(0);
}

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

// ============================================================
// Claude Code Installation
// ============================================================

async function installForClaude() {
  const MARKETPLACE_NAME = "ralph-codex-marketplace";
  const PLUGIN_KEY = `ralph-codex@${MARKETPLACE_NAME}`;
  const GITHUB_REPO = "vcz-Gray/ralph-codex";

  const claudeHome = getClaudeHome();
  const pluginsDir = getClaudePluginsDir();
  const marketplaceDir = join(pluginsDir, "marketplaces", MARKETPLACE_NAME);
  const cacheDir = getClaudePluginCacheDir();

  console.log("");
  console.log(
    `ralph-codex installer — Claude Code${dryRun ? " (DRY RUN)" : ""}`,
  );
  console.log(`Target: ${cacheDir}`);
  console.log("");

  if (!forceFlag && (await fileExists(cacheDir))) {
    if (dryRun) {
      log("!", "Existing installation found (would prompt for --force)");
    } else {
      log("!", "Existing installation found. Use --force to overwrite.");
      process.exit(1);
    }
  }

  // Step 1: Copy plugin files to cache
  console.log("[1/4] Copying plugin files...");
  const dirs = [
    ".claude-plugin",
    "commands",
    "hooks",
    "scripts",
    "skills",
    "lib",
  ];
  for (const dir of dirs) {
    const src = join(PROJECT_ROOT, dir);
    if (!(await fileExists(src))) continue;
    const dest = join(cacheDir, dir);
    log(">", `Copy ${dir}/ -> ${dest}`);
    if (!dryRun) {
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  }

  for (const file of ["package.json", "LICENSE", "README.md"]) {
    const src = join(PROJECT_ROOT, file);
    if (await fileExists(src)) {
      log(">", `Copy ${file}`);
      if (!dryRun) {
        await cp(src, join(cacheDir, file));
      }
    }
  }

  if (!dryRun) {
    for (const sf of [
      join(cacheDir, "hooks", "stop-hook.sh"),
      join(cacheDir, "scripts", "setup-ralph-loop.sh"),
    ]) {
      if (await fileExists(sf)) await chmod(sf, 0o755);
    }
  }

  // Step 2: Register marketplace
  console.log("[2/4] Registering marketplace...");
  const knownMarketplacesPath = join(pluginsDir, "known_marketplaces.json");
  let knownMarketplaces = {};

  if (await fileExists(knownMarketplacesPath)) {
    try {
      const raw = await readFile(knownMarketplacesPath, "utf-8");
      knownMarketplaces = JSON.parse(raw);
    } catch {
      log("!", "Warning: known_marketplaces.json malformed");
    }
  }

  knownMarketplaces[MARKETPLACE_NAME] = {
    source: { source: "github", repo: GITHUB_REPO },
    installLocation: marketplaceDir,
    lastUpdated: new Date().toISOString(),
  };

  log(">", `Register ${MARKETPLACE_NAME} in known_marketplaces.json`);
  if (!dryRun) {
    await writeFile(
      knownMarketplacesPath,
      JSON.stringify(knownMarketplaces, null, 2),
      "utf-8",
    );
  }

  // Create marketplace directory with marketplace.json
  const marketplaceJsonPath = join(
    marketplaceDir,
    ".claude-plugin",
    "marketplace.json",
  );
  log(">", `Create marketplace.json at ${marketplaceDir}`);
  if (!dryRun) {
    await mkdir(join(marketplaceDir, ".claude-plugin"), { recursive: true });
    await writeFile(
      marketplaceJsonPath,
      JSON.stringify(
        {
          name: MARKETPLACE_NAME,
          owner: { name: "graypark" },
          metadata: {
            description:
              "PRD-driven Ralph Loop with interactive interview, multi-agent orchestration, and stop hooks",
            version: "1.1.0",
          },
          plugins: [
            {
              name: "ralph-codex",
              source: "./",
              description:
                "Iterative AI development loops with PRD tracking and multi-agent orchestration",
              version: "1.1.0",
              keywords: [
                "ralph",
                "loop",
                "prd",
                "orchestration",
                "claude-code",
              ],
              category: "productivity",
              skills: "./skills/",
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    // Copy plugin.json to marketplace root too
    await cp(
      join(PROJECT_ROOT, ".claude-plugin", "plugin.json"),
      join(marketplaceDir, ".claude-plugin", "plugin.json"),
    );
  }

  // Step 3: Update installed_plugins.json
  console.log("[3/4] Registering plugin...");
  const installedPluginsPath = getClaudeInstalledPluginsPath();
  let installedPlugins = { version: 2, plugins: {} };

  if (await fileExists(installedPluginsPath)) {
    try {
      const raw = await readFile(installedPluginsPath, "utf-8");
      installedPlugins = JSON.parse(raw);
    } catch {
      log("!", "Warning: installed_plugins.json malformed, creating fresh");
    }
  }

  // Remove old key if exists
  delete installedPlugins.plugins["ralph-codex@ralph-codex"];

  installedPlugins.plugins[PLUGIN_KEY] = [
    {
      scope: "user",
      installPath: cacheDir,
      version: "1.1.0",
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    },
  ];

  log(">", `Register ${PLUGIN_KEY} in installed_plugins.json`);
  if (!dryRun) {
    await writeFile(
      installedPluginsPath,
      JSON.stringify(installedPlugins, null, 2),
      "utf-8",
    );
  }

  // Step 4: Enable plugin in settings.json
  console.log("[4/4] Enabling plugin in settings...");
  const settingsPath = getClaudeSettingsPath();
  let settings = {};

  if (await fileExists(settingsPath)) {
    try {
      const raw = await readFile(settingsPath, "utf-8");
      settings = JSON.parse(raw);
    } catch {
      log("!", "Warning: settings.json malformed");
    }
  }

  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }

  // Remove old key if exists
  delete settings.enabledPlugins["ralph-codex@ralph-codex"];

  settings.enabledPlugins[PLUGIN_KEY] = true;

  // Register marketplace in extraKnownMarketplaces if present
  if (!settings.extraKnownMarketplaces) {
    settings.extraKnownMarketplaces = {};
  }
  settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
    source: { source: "github", repo: GITHUB_REPO },
  };

  log(">", `Enable ${PLUGIN_KEY} in settings.json`);
  if (!dryRun) {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  }

  console.log("");
  if (dryRun) {
    log("\u2714", "Dry run complete. No files were modified.");
  } else {
    log("\u2714", "ralph-codex installed for Claude Code!");
    console.log("");
    console.log("  Run /reload-plugins in Claude Code to activate.");
    console.log("");
    console.log("  Usage:");
    console.log(
      '    /ralph-loop "Build a REST API" --max-iterations 20 --completion-promise "DONE"',
    );
    console.log("    /cancel-ralph");
    console.log("    /help    (ralph-codex help)");
    console.log("");
    console.log("  Skills (via Skill tool):");
    console.log("    ralph-codex:ralph-claude-interview");
    console.log("    ralph-codex:ralph-claude-orchestrator");
    console.log("");
    console.log("  To uninstall:");
    console.log("    npx @graypark/ralph-codex uninstall --claude");
  }
  console.log("");
}

// ============================================================
// Codex CLI Installation (existing logic)
// ============================================================

async function installForCodex() {
  const codexHome = localMode ? getLocalCodexDir() : getCodexHome();
  const pluginDir = localMode ? getLocalPluginDir() : getPluginInstallDir();
  const hooksJsonPath = localMode
    ? getLocalHooksJsonPath()
    : getHooksJsonPath();
  const skillsDir = localMode ? getLocalSkillsDir() : getSkillsDir();

  console.log("");
  console.log(`ralph-codex installer — Codex CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Mode: ${localMode ? "local (.codex/)" : "global (~/.codex/)"}`);
  console.log(`Target: ${pluginDir}`);
  console.log("");

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
  const dirs = ["hooks", "codex/commands", "lib"];
  for (const dir of dirs) {
    const src = join(PROJECT_ROOT, dir);
    // For codex/commands, flatten to commands/ in dest
    const destDir = dir === "codex/commands" ? "commands" : dir;
    const dest = join(pluginDir, destDir);
    log(">", `Copy ${dir}/ -> ${dest}`);
    if (!dryRun) {
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  }
  const pkgSrc = join(PROJECT_ROOT, "package.json");
  const pkgDest = join(pluginDir, "package.json");
  log(">", `Copy package.json -> ${pkgDest}`);
  if (!dryRun) {
    await cp(pkgSrc, pkgDest);
  }

  // Step 2: Merge hooks.json (Node.js stop hook for Codex CLI)
  console.log("[2/3] Configuring Stop hook...");
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

  existing.hooks.Stop = existing.hooks.Stop.filter((entry) => {
    const cmds = entry.hooks || [];
    return !cmds.some(
      (h) => h.command && h.command.includes(RALPH_HOOK_MARKER),
    );
  });

  existing.hooks.Stop.push(newEntry);

  log(">", `Merge Stop hook into ${hooksJsonPath}`);
  if (!dryRun) {
    await mkdir(dirname(hooksJsonPath), { recursive: true });
    await writeFile(hooksJsonPath, JSON.stringify(existing, null, 2), "utf-8");
  }

  // Step 3: Install skills
  console.log("[3/3] Installing skills...");

  // Command-based skills (from codex/commands/)
  const commandSkills = ["ralph-loop", "cancel-ralph"];
  for (const name of commandSkills) {
    const skillDir = join(skillsDir, name);
    const skillMd = join(skillDir, "SKILL.md");

    log(">", `Install skill: ${name} -> ${skillDir}`);

    if (!dryRun) {
      await mkdir(skillDir, { recursive: true });

      const content = await readFile(
        join(PROJECT_ROOT, "codex", "commands", `${name}.md`),
        "utf-8",
      );

      const resolved = content.replaceAll("${RALPH_CODEX_ROOT}", pluginDir);
      await writeFile(skillMd, resolved, "utf-8");
    }
  }

  // Standalone skills
  const standaloneSkills = [
    "ralph-interview",
    "ralph-orchestrator",
    "ralph-claude-interview",
    "ralph-claude-loop",
    "ralph-claude-cancel",
    "ralph-claude-orchestrator",
  ];
  for (const name of standaloneSkills) {
    const srcDir = join(PROJECT_ROOT, "skills", name);
    const destDir = join(skillsDir, name);

    log(">", `Install skill: ${name} -> ${destDir}`);

    if (!dryRun) {
      await mkdir(destDir, { recursive: true });
      await cp(srcDir, destDir, { recursive: true });
    }
  }

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
    console.log(
      "    npx @graypark/ralph-codex uninstall" + (localMode ? " --local" : ""),
    );
  }
  console.log("");
}

// ============================================================
// Main
// ============================================================

async function main() {
  if (claudeMode) {
    await installForClaude();
  } else {
    await installForCodex();
  }
}

main().catch((err) => {
  console.error(`\u2718 Installation failed: ${err.message}`);
  process.exit(1);
});
