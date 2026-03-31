// platforms/kiro-cli/installer.mjs
import { readFile, writeFile, mkdir, cp, access, rm } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "../..");

function getKiroHome() {
  return join(homedir(), ".kiro");
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

/**
 * Convert Claude Code frontmatter to Kiro steering manual mode format.
 * Strips Claude-specific fields (allowed-tools, argument-hint, hide-from-slash-command-tool)
 * and ensures `inclusion: manual` is set for Kiro CLI slash command support.
 */
function convertToKiroFrontmatter(content) {
  // Match the YAML frontmatter block
  const fmRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(fmRegex);

  if (!match) {
    // No frontmatter found — add Kiro frontmatter
    return `---\ninclusion: manual\n---\n\n${content}`;
  }

  // Extract the body after frontmatter
  const body = content.slice(match[0].length);

  // Build new Kiro frontmatter with inclusion: manual
  return `---\ninclusion: manual\n---\n\n${body}`;
}

export async function detect() {
  return fileExists(getKiroHome());
}

export async function install({ dryRun = false, force = false } = {}) {
  const kiroHome = getKiroHome();
  const agentsDir = join(kiroHome, "agents");
  const steeringDir = join(kiroHome, "steering");

  console.log("");
  console.log(`loophaus installer — Kiro CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Target: ${kiroHome}`);
  console.log("");

  // Step 1: Create agent config with stop hook
  console.log("[1/3] Configuring agent with stop hook...");
  const agentConfig = {
    name: "loophaus",
    description: "loophaus — iterative dev loop agent",
    hooks: {
      stop: [{ command: `node "${join(PROJECT_ROOT, "hooks", "stop-hook.mjs")}"` }],
    },
  };

  const agentPath = join(agentsDir, "loophaus.json");
  if (!force && await fileExists(agentPath)) {
    if (dryRun) {
      console.log("  ! Existing agent config found (would prompt for --force)");
    } else {
      console.log("  ! Existing agent config found. Use --force to overwrite.");
      return false;
    }
  }

  console.log(`  > Write ${agentPath}`);
  if (!dryRun) {
    await mkdir(agentsDir, { recursive: true });
    await writeFile(agentPath, JSON.stringify(agentConfig, null, 2), "utf-8");
  }

  // Step 2: Clean up legacy ralph-* steering files
  console.log("[2/3] Cleaning up legacy steering files...");
  const legacySteering = [
    "ralph-loop.md",
    "cancel-ralph.md",
  ];
  for (const name of legacySteering) {
    const legacyPath = join(steeringDir, name);
    if (await fileExists(legacyPath)) {
      console.log(`  > Remove legacy steering: ${name}`);
      if (!dryRun) await rm(legacyPath);
    }
  }

  // Step 3: Copy steering files with Kiro frontmatter conversion
  console.log("[3/3] Installing steering files...");
  const commands = [
    { src: "commands/loop.md", dest: "loop.md" },
    { src: "commands/loop-plan.md", dest: "loop-plan.md" },
    { src: "commands/loop-stop.md", dest: "loop-stop.md" },
    { src: "commands/loop-pulse.md", dest: "loop-pulse.md" },
  ];
  for (const { src, dest } of commands) {
    const srcPath = join(PROJECT_ROOT, src);
    if (await fileExists(srcPath)) {
      const destPath = join(steeringDir, dest);
      console.log(`  > Copy ${src} -> ${destPath} (Kiro frontmatter)`);
      if (!dryRun) {
        await mkdir(steeringDir, { recursive: true });
        const content = await readFile(srcPath, "utf-8");
        const kiroContent = convertToKiroFrontmatter(content);
        await writeFile(destPath, kiroContent, "utf-8");
      }
    }
  }

  console.log("");
  if (dryRun) {
    console.log("  \u2714 Dry run complete. No files were modified.");
  } else {
    console.log("  \u2714 loophaus installed for Kiro CLI!");
    console.log("  Commands: /loop, /loop-plan, /loop-stop, /loop-pulse");
    console.log("  To uninstall: npx @graypark/loophaus uninstall --kiro");
  }
  console.log("");
  return true;
}

export async function uninstall({ dryRun = false } = {}) {
  const kiroHome = getKiroHome();

  const targets = [
    join(kiroHome, "agents", "loophaus.json"),
    join(kiroHome, "steering", "loop.md"),
    join(kiroHome, "steering", "loop-plan.md"),
    join(kiroHome, "steering", "loop-stop.md"),
    join(kiroHome, "steering", "loop-pulse.md"),
    // Legacy steering files
    join(kiroHome, "steering", "ralph-loop.md"),
    join(kiroHome, "steering", "cancel-ralph.md"),
  ];

  console.log("");
  console.log(`loophaus uninstaller — Kiro CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log("");

  for (const p of targets) {
    if (await fileExists(p)) {
      console.log(`  > Remove ${p}`);
      if (!dryRun) await rm(p);
    }
  }

  console.log("");
  console.log("  \u2714 loophaus removed from Kiro CLI.");
  console.log("");
}
