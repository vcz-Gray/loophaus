import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const name = ctx.getFlag("--name");
  const { read } = await import("../../store/state-store.js");
  const state = await read(undefined, name);
  if (!state.active) {
    console.log(name ? `No active loop: ${name}` : "No active loop.");
    return;
  }
  const iterInfo = state.maxIterations > 0
    ? `${state.currentIteration}/${state.maxIterations}`
    : `${state.currentIteration}`;
  console.log(`Loop Status`);
  console.log(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  if (name) console.log(`Name:       ${name}`);
  console.log(`Active:     yes`);
  console.log(`Iteration:  ${iterInfo}`);
  console.log(`Promise:    ${state.completionPromise || "(none)"}`);

  try {
    const { readFile } = await import("node:fs/promises");
    const prd = JSON.parse(await readFile("prd.json", "utf-8")) as {
      userStories?: Array<{ id: string; title: string; passes?: boolean }>;
    };
    if (Array.isArray(prd.userStories)) {
      const done = prd.userStories.filter((s) => s.passes === true).length;
      const total = prd.userStories.length;
      console.log("");
      console.log("Stories");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      for (const s of prd.userStories) {
        const icon = s.passes ? "\u2713" : " ";
        console.log(`  ${icon} ${s.id}  ${s.title}`);
      }
      console.log(`\n  Progress: ${done}/${total} done`);
    }
  } catch { /* no prd.json */ }
}
