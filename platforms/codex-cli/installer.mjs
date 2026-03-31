// platforms/codex-cli/installer.mjs
import { readFile, writeFile, mkdir, cp, access, rm } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getAgentsHome,
  getAgentsSkillsDir,
} from "../../lib/paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "../..");

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function detect() {
  return (await fileExists(getCodexHome())) || (await fileExists(getAgentsHome()));
}

// Legacy ralph-* skill names to clean up
const LEGACY_SKILLS = [
  "ralph-loop",
  "cancel-ralph",
  "ralph-interview",
  "ralph-orchestrator",
  "ralph-claude-interview",
  "ralph-claude-loop",
  "ralph-claude-cancel",
  "ralph-claude-orchestrator",
];

// New skill definitions for Codex CLI
const CODEX_SKILLS = {
  loop: {
    content: `---
name: loop
description: "Start iterative dev loop"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
---

# /loop — Start Iterative Dev Loop

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
description: "Stop active loop"
---

# /loop-stop

1. Check \`.loophaus/state.json\` exists
   - Also check legacy \`.codex/ralph-loop.state.json\`

2. If not found: "No active loop."

3. If found: read \`currentIteration\`, set \`active: false\`, report "Stopped loop at iteration N."
`,
  },
  "loop-plan": {
    content: `---
name: loop-plan
description: "Plan and start loop via interactive interview"
argument-hint: "TASK_DESCRIPTION"
---

# /loop-plan — Interactive Planning & Loop

## Phase 1: Discovery Interview
Ask 3-5 focused questions about the task to understand scope, acceptance criteria, constraints.

## Phase 2: PRD Generation
Generate \`prd.json\` with right-sized user stories.

## Phase 3: Loop Activation
Create \`.loophaus/state.json\` and start working on US-001 immediately.

Use \`<promise>TASK COMPLETE</promise>\` ONLY when ALL stories pass.
`,
  },
  "loop-pulse": {
    content: `---
name: loop-pulse
description: "Check loop status"
---

# /loop-pulse

1. Read \`.loophaus/state.json\` (or legacy paths)
2. If active, show iteration, promise, progress
3. If \`prd.json\` exists, show story progress
`,
  },
};

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

  const totalSteps = local ? 4 : 5;

  // Step 1: Clean up legacy ralph-* skills
  console.log(`[1/${totalSteps}] Cleaning up legacy skills...`);
  for (const name of LEGACY_SKILLS) {
    const legacyDir = join(skillsDir, name);
    if (await fileExists(legacyDir)) {
      console.log(`  > Remove legacy skill: ${name}`);
      if (!dryRun) {
        await rm(legacyDir, { recursive: true, force: true });
      }
    }
  }

  // Step 2: Copy files
  console.log(`[2/${totalSteps}] Copying plugin files...`);
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

  // Step 3: Hooks
  console.log(`[3/${totalSteps}] Configuring Stop hook...`);
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

  // Step 4: Install skills to ~/.codex/skills/
  console.log(`[4/${totalSteps}] Installing skills to ~/.codex/skills/...`);
  for (const [name, skill] of Object.entries(CODEX_SKILLS)) {
    const skillDir = join(skillsDir, name);
    console.log(`  > Install skill: ${name}`);
    if (!dryRun) {
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        skill.content.replaceAll("${RALPH_CODEX_ROOT}", pluginDir).replaceAll("${LOOPHAUS_ROOT}", pluginDir),
        "utf-8",
      );
    }
  }

  // Step 5: Mirror skills to ~/.agents/skills/ (new Codex CLI standard path)
  if (!local) {
    const agentsSkillsDir = getAgentsSkillsDir();
    console.log(`[5/${totalSteps}] Installing skills to ~/.agents/skills/...`);
    for (const [name, skill] of Object.entries(CODEX_SKILLS)) {
      const skillDir = join(agentsSkillsDir, name);
      console.log(`  > Install skill: ${name}`);
      if (!dryRun) {
        await mkdir(skillDir, { recursive: true });
        await writeFile(
          join(skillDir, "SKILL.md"),
          skill.content.replaceAll("${RALPH_CODEX_ROOT}", pluginDir).replaceAll("${LOOPHAUS_ROOT}", pluginDir),
          "utf-8",
        );
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
