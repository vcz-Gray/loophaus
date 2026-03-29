// platforms/codex-cli/installer.mjs
import { readFile, writeFile, mkdir, cp, access } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
} from "../../lib/paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "../..");

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function detect() {
  return fileExists(getCodexHome());
}

export async function install({ dryRun = false, force = false, local = false } = {}) {
  const pluginDir = local
    ? join(process.cwd(), ".codex", "plugins", "loophaus")
    : getPluginInstallDir();
  const hooksJsonPath = local
    ? join(process.cwd(), ".codex", "hooks.json")
    : getHooksJsonPath();
  const skillsDir = local
    ? join(process.cwd(), ".codex", "skills")
    : getSkillsDir();

  console.log("");
  console.log(`loophaus installer — Codex CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Mode: ${local ? "local (.codex/)" : "global (~/.codex/)"}`);
  console.log(`Target: ${pluginDir}`);
  console.log("");

  if (!force && await fileExists(pluginDir)) {
    if (dryRun) {
      console.log("  ! Existing installation found (would prompt for --force)");
    } else {
      console.log("  ! Existing installation found. Use --force to overwrite.");
      return false;
    }
  }

  // Step 1: Copy files
  console.log("[1/3] Copying plugin files...");
  for (const dir of ["hooks", "codex/commands", "lib", "core", "store"]) {
    const src = join(PROJECT_ROOT, dir);
    if (!(await fileExists(src))) continue;
    const destDir = dir === "codex/commands" ? "commands" : dir;
    const dest = join(pluginDir, destDir);
    console.log(`  > Copy ${dir}/ -> ${dest}`);
    if (!dryRun) {
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  }
  if (!dryRun) await cp(join(PROJECT_ROOT, "package.json"), join(pluginDir, "package.json"));

  // Step 2: Hooks
  console.log("[2/3] Configuring Stop hook...");
  const stopCmd = `node "${join(pluginDir, "hooks", "stop-hook.mjs")}"`;
  let existing = { hooks: {} };
  if (await fileExists(hooksJsonPath)) {
    try { existing = JSON.parse(await readFile(hooksJsonPath, "utf-8")); } catch { existing = { hooks: {} }; }
  }
  if (!existing.hooks) existing.hooks = {};
  if (!Array.isArray(existing.hooks.Stop)) existing.hooks.Stop = [];
  existing.hooks.Stop = existing.hooks.Stop.filter(e =>
    !(e.hooks || []).some(h => h.command && h.command.includes("loophaus"))
  );
  existing.hooks.Stop.push({ hooks: [{ type: "command", command: stopCmd, timeout: 30 }] });
  if (!dryRun) {
    await mkdir(dirname(hooksJsonPath), { recursive: true });
    await writeFile(hooksJsonPath, JSON.stringify(existing, null, 2), "utf-8");
  }

  // Step 3: Skills
  console.log("[3/3] Installing skills...");
  for (const name of ["ralph-loop", "cancel-ralph"]) {
    const skillDir = join(skillsDir, name);
    const src = name === "ralph-loop" ? "codex/commands/ralph-loop.md" : "codex/commands/cancel-ralph.md";
    console.log(`  > Install skill: ${name}`);
    if (!dryRun) {
      await mkdir(skillDir, { recursive: true });
      const srcPath = join(PROJECT_ROOT, src);
      if (await fileExists(srcPath)) {
        const content = await readFile(srcPath, "utf-8");
        await writeFile(
          join(skillDir, "SKILL.md"),
          content.replaceAll("${RALPH_CODEX_ROOT}", pluginDir).replaceAll("${LOOPHAUS_ROOT}", pluginDir),
          "utf-8",
        );
      }
    }
  }

  const standaloneSkills = [
    "ralph-interview",
    "ralph-orchestrator",
    "ralph-claude-interview",
    "ralph-claude-loop",
    "ralph-claude-cancel",
    "ralph-claude-orchestrator",
  ];
  for (const sk of standaloneSkills) {
    const srcDir = join(PROJECT_ROOT, "skills", sk);
    if (await fileExists(srcDir)) {
      console.log(`  > Install skill: ${sk}`);
      if (!dryRun) {
        await mkdir(join(skillsDir, sk), { recursive: true });
        await cp(srcDir, join(skillsDir, sk), { recursive: true });
      }
    }
  }

  console.log("");
  if (dryRun) {
    console.log("  \u2714 Dry run complete. No files were modified.");
  } else {
    console.log("  \u2714 loophaus installed for Codex CLI!");
    console.log("  Commands: /loop, /loop-plan, /loop-stop, /loop-pulse");
    console.log(`  To uninstall: npx @graypark/loophaus uninstall${local ? " --local" : ""}`);
  }
  console.log("");
  return true;
}
