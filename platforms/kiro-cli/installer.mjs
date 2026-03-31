// platforms/kiro-cli/installer.mjs
import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
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

// Kiro CLI skill definitions (description-based auto-matching)
const KIRO_SKILLS = {
  loop: {
    content: `---
name: loop
description: "Start iterative dev loop — use when user says 'start loop', 'loop this', 'iterate on task', 'run loop'"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
---

# Start Iterative Dev Loop

Parse the user's arguments:
1. Extract \`--max-iterations N\` (default: 20)
2. Extract \`--completion-promise TEXT\` (default: "TADA")
3. Everything else is the prompt

Create \`.loophaus/state.json\`:
\`\`\`json
{
  "active": true,
  "prompt": "<user's prompt>",
  "completionPromise": "<promise text>",
  "maxIterations": 20,
  "currentIteration": 0,
  "sessionId": ""
}
\`\`\`

Then begin working on the task. The stop hook intercepts exit and feeds the SAME PROMPT back.

CRITICAL: If a completion promise is set, ONLY output \`<promise>TEXT</promise>\` when genuinely complete.
`,
  },
  "loop-stop": {
    content: `---
name: loop-stop
description: "Stop active loop — use when user says 'stop loop', 'cancel loop', 'halt', 'stop iterating'"
---

# Stop Active Loop

1. Check if \`.loophaus/state.json\` exists
2. If not found: "No active loop."
3. If found: read currentIteration, set active: false, report "Stopped loop at iteration N."
`,
  },
  "loop-plan": {
    content: `---
name: loop-plan
description: "Plan and start loop via interactive interview — use when user says 'plan loop', 'interview', 'create PRD', 'plan task'"
argument-hint: "TASK_DESCRIPTION"
---

# Interactive Planning & Loop

## Phase 1: Discovery Interview
Ask 3-5 focused questions about the task.

## Phase 2: PRD Generation
Generate prd.json with right-sized user stories.

## Phase 3: Loop Activation
Create .loophaus/state.json and start working on US-001 immediately.

Use \`<promise>TASK COMPLETE</promise>\` ONLY when ALL stories pass.
`,
  },
  "loop-pulse": {
    content: `---
name: loop-pulse
description: "Check loop status — use when user says 'loop status', 'check progress', 'how is the loop', 'pulse'"
---

# Check Loop Status

1. Read .loophaus/state.json
2. If active: show iteration, promise, progress
3. If prd.json exists: show story progress (done/total)
`,
  },
};

// Legacy files to clean up
const LEGACY_STEERING = [
  "steering/ralph-loop.md",
  "steering/cancel-ralph.md",
  "steering/loop.md",
  "steering/loop-plan.md",
  "steering/loop-stop.md",
  "steering/loop-pulse.md",
];

export async function detect() {
  return fileExists(getKiroHome());
}

export async function install({ dryRun = false, force = false } = {}) {
  const kiroHome = getKiroHome();
  const agentsDir = join(kiroHome, "agents");
  const skillsDir = join(kiroHome, "skills");

  console.log("");
  console.log(`loophaus installer — Kiro CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Target: ${kiroHome}`);
  console.log("");

  // Step 1: Create agent config with stop hook
  console.log("[1/4] Configuring agent with stop hook...");
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

  // Step 2: Clean up legacy steering files
  console.log("[2/4] Cleaning up legacy steering files...");
  for (const relPath of LEGACY_STEERING) {
    const fullPath = join(kiroHome, relPath);
    if (await fileExists(fullPath)) {
      console.log(`  > Remove legacy: ${relPath}`);
      if (!dryRun) await rm(fullPath);
    }
  }

  // Step 3: Clean up legacy skill directories (in case of partial migration)
  console.log("[3/4] Cleaning up legacy skill directories...");
  const legacySkillNames = ["ralph-loop", "cancel-ralph"];
  for (const name of legacySkillNames) {
    const legacySkillDir = join(skillsDir, name);
    if (await fileExists(legacySkillDir)) {
      console.log(`  > Remove legacy skill: ${name}`);
      if (!dryRun) await rm(legacySkillDir, { recursive: true, force: true });
    }
  }

  // Step 4: Install skills (description-based auto-matching)
  console.log("[4/4] Installing skills...");
  for (const [name, skill] of Object.entries(KIRO_SKILLS)) {
    const skillDir = join(skillsDir, name);
    console.log(`  > Install skill: ${name}`);
    if (!dryRun) {
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, "SKILL.md"), skill.content, "utf-8");
    }
  }

  console.log("");
  if (dryRun) {
    console.log("  \u2714 Dry run complete. No files were modified.");
  } else {
    console.log("  \u2714 loophaus installed for Kiro CLI!");
    console.log("  Skills auto-match via description keywords.");
    console.log("  To uninstall: npx @graypark/loophaus uninstall --kiro");
  }
  console.log("");
  return true;
}

export async function uninstall({ dryRun = false } = {}) {
  const kiroHome = getKiroHome();

  console.log("");
  console.log(`loophaus uninstaller — Kiro CLI${dryRun ? " (DRY RUN)" : ""}`);
  console.log("");

  // Remove agent config
  const agentPath = join(kiroHome, "agents", "loophaus.json");
  if (await fileExists(agentPath)) {
    console.log(`  > Remove ${agentPath}`);
    if (!dryRun) await rm(agentPath);
  }

  // Remove skill directories
  const skillNames = ["loop", "loop-stop", "loop-plan", "loop-pulse"];
  for (const name of skillNames) {
    const skillDir = join(kiroHome, "skills", name);
    if (await fileExists(skillDir)) {
      console.log(`  > Remove skill: ${skillDir}`);
      if (!dryRun) await rm(skillDir, { recursive: true, force: true });
    }
  }

  // Remove legacy steering files
  for (const relPath of LEGACY_STEERING) {
    const fullPath = join(kiroHome, relPath);
    if (await fileExists(fullPath)) {
      console.log(`  > Remove legacy: ${fullPath}`);
      if (!dryRun) await rm(fullPath);
    }
  }

  // Remove legacy skill directories
  const legacySkillNames = ["ralph-loop", "cancel-ralph"];
  for (const name of legacySkillNames) {
    const legacySkillDir = join(kiroHome, "skills", name);
    if (await fileExists(legacySkillDir)) {
      console.log(`  > Remove legacy skill: ${legacySkillDir}`);
      if (!dryRun) await rm(legacySkillDir, { recursive: true, force: true });
    }
  }

  console.log("");
  if (dryRun) {
    console.log("  \u2714 Dry run complete. No files were modified.");
  } else {
    console.log("  \u2714 loophaus removed from Kiro CLI.");
  }
  console.log("");
}
