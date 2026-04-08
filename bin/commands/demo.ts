import type { CliContext } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { mkdtemp, writeFile, rm, mkdir } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join: pathJoin } = await import("node:path");
  const { execSync } = await import("node:child_process");

  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  console.log(`loophaus demo`);
  console.log(`\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log();

  const demoDir = await mkdtemp(pathJoin(tmpdir(), "loophaus-demo-"));

  try {
    // Initialize git repo
    execSync("git init -q", { cwd: demoDir, stdio: "ignore" });
    execSync("git config user.email 'demo@loophaus.dev'", { cwd: demoDir, stdio: "ignore" });
    execSync("git config user.name 'loophaus-demo'", { cwd: demoDir, stdio: "ignore" });

    // Write broken index.mjs
    const indexContent = `// index.mjs — broken sum function
export function sum(a, b) {
  return a - b; // BUG: should be a + b
}
`;
    await writeFile(pathJoin(demoDir, "index.mjs"), indexContent, "utf-8");

    // Write prd.json with 2 stories
    const prd = {
      title: "Fix sum module",
      userStories: [
        { id: "US-001", title: "Fix sum function", acceptance: "sum(2, 3) returns 5", passes: false },
        { id: "US-002", title: "Add tests", acceptance: "test file verifies sum works", passes: false },
      ],
    };
    await writeFile(pathJoin(demoDir, "prd.json"), JSON.stringify(prd, null, 2), "utf-8");

    // Write state.json
    await mkdir(pathJoin(demoDir, ".loophaus"), { recursive: true });
    const state = { active: true, currentIteration: 0, maxIterations: 4, completionPromise: "Fix sum module" };
    await writeFile(pathJoin(demoDir, ".loophaus", "state.json"), JSON.stringify(state, null, 2), "utf-8");

    // Initial commit
    execSync("git add -A && git commit -q -m 'init: broken sum'", { cwd: demoDir, stdio: "ignore" });

    // Show project tree
    console.log(`Creating demo project...`);
    console.log();
    await sleep(400);
    console.log(`\uD83D\uDCC1 ${demoDir}/`);
    console.log(`\u251C\u2500\u2500 index.mjs        (broken sum function)`);
    console.log(`\u251C\u2500\u2500 prd.json          (2 stories)`);
    console.log(`\u2514\u2500\u2500 .loophaus/state.json`);
    console.log();
    await sleep(600);

    // Simulate iteration 1
    console.log(`Simulating loop iteration 1/4...`);
    await sleep(300);
    console.log(`  \u2192 Reading prd.json: 2 stories, 0 done`);
    await sleep(400);
    console.log(`  \u2192 Working on US-001: Fix sum function`);
    await sleep(600);
    console.log(`  \u2192 Verified: sum(2, 3) = 5 \u2713`);
    await sleep(300);
    console.log(`  \u2192 Committed: feat: US-001 Fix sum function`);
    console.log();
    await sleep(500);

    // Simulate iteration 2
    console.log(`Simulating loop iteration 2/4...`);
    await sleep(300);
    console.log(`  \u2192 Reading prd.json: 2 stories, 1 done`);
    await sleep(400);
    console.log(`  \u2192 Working on US-002: Add tests`);
    await sleep(600);
    console.log(`  \u2192 Verified: 2 tests passing \u2713`);
    await sleep(300);
    console.log(`  \u2192 Committed: feat: US-002 Add tests`);
    console.log();
    await sleep(500);

    console.log(`Quality Score: 95/100 (A+)`);
    console.log();
    console.log(`All stories complete! \uD83C\uDF89`);
    console.log();
    console.log(`This is what /loop-plan does autonomously in your real projects.`);
    console.log();
    console.log(`Try it:`);
    console.log(`  cd your-project`);
    console.log(`  /loop-plan "describe your task here"`);
    console.log();

    console.log(`Cleaning up demo...`);
  } finally {
    // Clean up temp directory
    await rm(demoDir, { recursive: true, force: true });
  }
}
