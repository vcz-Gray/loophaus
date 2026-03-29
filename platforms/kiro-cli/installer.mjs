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
  console.log("[1/2] Configuring agent with stop hook...");
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

  // Step 2: Copy steering files
  console.log("[2/2] Installing steering files...");
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
      console.log(`  > Copy ${src} -> ${destPath}`);
      if (!dryRun) {
        await mkdir(steeringDir, { recursive: true });
        await cp(srcPath, destPath);
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
