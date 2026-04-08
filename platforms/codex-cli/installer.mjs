// platforms/codex-cli/installer.mjs
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  getCodexHome,
  getHooksJsonPath,
  getPluginInstallDir,
  getSkillsDir,
  getAgentsHome,
  getAgentsSkillsDir,
} from "../../lib/paths.js";
import {
  fileExists,
  getProjectRoot,
  printBanner,
  checkExisting,
  copyDirs,
  printResult,
} from "../base-installer.mjs";

const PROJECT_ROOT = getProjectRoot(import.meta.url);

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
description: "Plan and start loop via interactive interview — auto-parallelizes across worktrees"
argument-hint: "TASK_DESCRIPTION"
---

# /loop-plan — Plan, Parallelize, Execute, Merge

## Phase 1: Discovery Interview
Ask 3-5 focused questions about scope, success criteria, verification commands, parallelism potential.

## Phase 2: PRD Generation
Generate \`prd.json\` with user stories. Each story has: id, title, description, acceptanceCriteria, priority, passes, group (for parallel distribution), testCommand.

## Phase 3: Parallelism Assessment
Score the task: stories span 3+ dirs (+2), independent (+2), multiple services (+3), 6+ stories (+1), need full context (-2), strict ordering (-3).
Score >= 3: parallel mode (worktrees by group). Score < 3: sequential mode.

## Phase 4A: Parallel Execution (score >= 3)
1. Group stories by \`group\` field
2. For each group, create an isolated worktree and assign stories
3. Run all groups simultaneously
4. When all complete, merge branches back (squash strategy)
5. Run full verification on merged result

## Phase 4B: Sequential Execution (score < 3)
Create \`.loophaus/state.json\` and work through stories one at a time.

## Phase 5: Evaluate
Score each story 0-100 (tests, typecheck, lint, verify, diff size). Record in \`.loophaus/results.tsv\`.

## Phase 6: Refine Loop (autoresearch pattern)
For stories below quality threshold (default 80), loop up to 3 attempts:
1. Checkpoint, 2. Re-implement weak areas, 3. Re-evaluate.
Keep if improved, discard (git reset) if not. Best-effort after max attempts.

## Rules
- Present PRD for user approval before execution
- Show parallelism score and recommendation
- If merge conflict: STOP and report
- Use \`<promise>TASK COMPLETE</promise>\` ONLY when ALL stories pass
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

  printBanner("Codex CLI", {
    dryRun,
    target: pluginDir,
    mode: local ? "local (.codex/)" : "global (~/.codex/)",
  });

  if (!(await checkExisting(pluginDir, { dryRun, force }))) return false;

  const totalSteps = 4;

  // Step 1: Clean up legacy skills from ~/.codex/skills/
  console.log(`[1/${totalSteps}] Cleaning up legacy skills...`);
  const CLEANUP_FROM_CODEX = [...LEGACY_SKILLS, "loop", "loop-stop", "loop-plan", "loop-pulse"];
  for (const name of CLEANUP_FROM_CODEX) {
    const legacyDir = join(skillsDir, name);
    if (await fileExists(legacyDir)) {
      console.log(`  > Remove from ~/.codex/skills/: ${name}`);
      if (!dryRun) {
        await rm(legacyDir, { recursive: true, force: true });
      }
    }
  }

  // Step 2: Copy files
  console.log(`[2/${totalSteps}] Copying plugin files...`);
  await copyDirs(
    [
      "hooks",
      { src: "codex/commands", dest: "commands" },
      "scripts",
      "lib",
      "core",
      "store",
    ],
    PROJECT_ROOT, pluginDir, { dryRun },
  );
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

  // Step 4: Install skills to standard path
  // Global: ~/.agents/skills/ (new Codex CLI standard — avoids duplicates with ~/.codex/skills/)
  // Local: .codex/skills/ (project-scoped)
  const targetSkillsDir = local ? skillsDir : getAgentsSkillsDir();
  console.log(`[4/${totalSteps}] Installing skills to ${local ? ".codex/skills/" : "~/.agents/skills/"}...`);
  for (const [name, skill] of Object.entries(CODEX_SKILLS)) {
    const skillDir = join(targetSkillsDir, name);
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

  printResult({
    dryRun,
    successLines: [
      "  \u2714 loophaus installed for Codex CLI!",
      "  Commands: /loop, /loop-plan, /loop-stop, /loop-pulse",
      `  To uninstall: npx @graypark/loophaus uninstall${local ? " --local" : ""}`,
    ],
  });
  return true;
}
