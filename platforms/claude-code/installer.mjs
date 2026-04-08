// platforms/claude-code/installer.mjs
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { join } from "node:path";
import {
  getClaudeHome,
  getClaudePluginsDir,
  getClaudePluginCacheDir,
  getClaudeSettingsPath,
  getClaudeInstalledPluginsPath,
  getPackageVersion,
} from "../../lib/paths.js";
import {
  fileExists,
  getProjectRoot,
  printBanner,
  checkExisting,
  copyDirs,
  copyFiles,
  printResult,
} from "../base-installer.mjs";

const PROJECT_ROOT = getProjectRoot(import.meta.url);

export async function detect() {
  return fileExists(join(getClaudeHome(), "settings.json")) || fileExists(getClaudeHome());
}

export async function install({ dryRun = false, force = false } = {}) {
  const MARKETPLACE_NAME = "loophaus-marketplace";
  const PLUGIN_KEY = `loophaus@${MARKETPLACE_NAME}`;
  const GITHUB_REPO = "vcz-Gray/loophaus";
  const version = getPackageVersion();
  const cacheDir = getClaudePluginCacheDir();
  const pluginsDir = getClaudePluginsDir();
  const marketplaceDir = join(pluginsDir, "marketplaces", MARKETPLACE_NAME);

  printBanner("Claude Code", { dryRun, target: cacheDir, version });

  if (!(await checkExisting(cacheDir, { dryRun, force }))) return false;

  // Step 1: Copy plugin files
  console.log("[1/4] Copying plugin files...");
  await copyDirs(
    [".claude-plugin", "commands", "hooks", "scripts", "skills", "lib", "core", "store"],
    PROJECT_ROOT, cacheDir, { dryRun },
  );
  await copyFiles(["package.json", "LICENSE", "README.md"], PROJECT_ROOT, cacheDir, { dryRun });

  if (!dryRun) {
    const sh = join(cacheDir, "scripts", "setup-ralph-loop.sh");
    if (await fileExists(sh)) await chmod(sh, 0o755);
    const nodeScript = join(cacheDir, "scripts", "setup-loop.mjs");
    if (await fileExists(nodeScript)) await chmod(nodeScript, 0o755);
  }

  // Step 2: Register marketplace
  console.log("[2/4] Registering marketplace...");
  const knownPath = join(pluginsDir, "known_marketplaces.json");
  let known = {};
  if (await fileExists(knownPath)) {
    try { known = JSON.parse(await readFile(knownPath, "utf-8")); } catch {}
  }
  known[MARKETPLACE_NAME] = {
    source: { source: "github", repo: GITHUB_REPO },
    installLocation: marketplaceDir,
    lastUpdated: new Date().toISOString(),
  };
  if (!dryRun) await writeFile(knownPath, JSON.stringify(known, null, 2), "utf-8");

  const mpDir = join(marketplaceDir, ".claude-plugin");
  if (!dryRun) {
    await mkdir(mpDir, { recursive: true });
    await writeFile(join(mpDir, "marketplace.json"), JSON.stringify({
      name: MARKETPLACE_NAME,
      owner: { name: "graypark" },
      metadata: { description: "loophaus — Control plane for coding agents", version },
      plugins: [{
        name: "loophaus",
        source: "./",
        description: "Iterative dev loops with stop hooks",
        version,
        keywords: ["loophaus", "loop", "control-plane"],
        category: "productivity",
        skills: "./skills/",
      }],
    }, null, 2), "utf-8");
    // Copy plugin.json and patch version dynamically
    const pluginJson = JSON.parse(await readFile(join(PROJECT_ROOT, ".claude-plugin", "plugin.json"), "utf-8"));
    pluginJson.version = version;
    await writeFile(join(mpDir, "plugin.json"), JSON.stringify(pluginJson, null, 2), "utf-8");

    // Also patch the cached copy
    const cachedPluginJson = join(cacheDir, ".claude-plugin", "plugin.json");
    if (await fileExists(cachedPluginJson)) {
      const cached = JSON.parse(await readFile(cachedPluginJson, "utf-8"));
      cached.version = version;
      await writeFile(cachedPluginJson, JSON.stringify(cached, null, 2), "utf-8");
    }
  }

  // Step 3: installed_plugins.json
  console.log("[3/4] Registering plugin...");
  const ipPath = getClaudeInstalledPluginsPath();
  let ip = { version: 2, plugins: {} };
  if (await fileExists(ipPath)) {
    try { ip = JSON.parse(await readFile(ipPath, "utf-8")); } catch {}
  }
  delete ip.plugins["ralph-codex@ralph-codex"];
  delete ip.plugins["ralph-codex@ralph-codex-marketplace"];
  ip.plugins[PLUGIN_KEY] = [{
    scope: "user",
    installPath: cacheDir,
    version,
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  }];
  if (!dryRun) await writeFile(ipPath, JSON.stringify(ip, null, 2), "utf-8");

  // Step 4: settings.json
  console.log("[4/4] Enabling plugin...");
  const settingsPath = getClaudeSettingsPath();
  let settings = {};
  if (await fileExists(settingsPath)) {
    try { settings = JSON.parse(await readFile(settingsPath, "utf-8")); } catch {}
  }
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  delete settings.enabledPlugins["ralph-codex@ralph-codex"];
  delete settings.enabledPlugins["ralph-codex@ralph-codex-marketplace"];
  settings.enabledPlugins[PLUGIN_KEY] = true;
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
    source: { source: "github", repo: GITHUB_REPO },
  };
  if (!dryRun) await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");

  printResult({
    dryRun,
    successLines: [
      "  \u2714 loophaus installed for Claude Code!",
      "",
      "  Run /reload-plugins in Claude Code to activate.",
      "  Commands: /loop, /loop-plan, /loop-stop, /loop-pulse",
      "  To uninstall: npx @graypark/loophaus uninstall --claude",
    ],
  });
  return true;
}

export async function uninstall({ dryRun = false } = {}) {
  const { uninstall: doUninstall } = await import("../../bin/uninstall.js");
  return doUninstall({ dryRun, claude: true });
}
