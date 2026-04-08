import { join } from "node:path";
import { getLoophausHome } from "../../lib/paths.js";
import type { CliContext } from "../cli-utils.js";
import { spinner } from "../cli-utils.js";

async function detectHosts(): Promise<string[]> {
  const hosts: string[] = [];
  const { detect: detectClaude } = await import("../../platforms/claude-code/installer.mjs");
  const { detect: detectCodex } = await import("../../platforms/codex-cli/installer.mjs");
  const { detect: detectKiro } = await import("../../platforms/kiro-cli/installer.mjs");

  if (await detectClaude()) hosts.push("claude-code");
  if (await detectCodex()) hosts.push("codex-cli");
  if (await detectKiro()) hosts.push("kiro-cli");
  return hosts;
}

export async function run(ctx: CliContext): Promise<void> {
  const { getPackageVersion } = await import("../../lib/paths.js");
  const version = getPackageVersion();
  const quiet = ctx.args.includes("--quiet");
  const loophausDir = getLoophausHome();
  const welcomePath = join(loophausDir, ".welcome-seen");

  const host = ctx.args.includes("--claude") ? "claude-code"
    : ctx.args.includes("--kiro") ? "kiro-cli"
    : ctx.getFlag("--host") || null;

  let targets: string[] = [];

  if (host) {
    targets = [host];
  } else {
    targets = await detectHosts();
    if (targets.length === 0) {
      console.log("No supported hosts detected. Install Claude Code, Codex CLI, or Kiro CLI first.");
      console.log("Or specify a host: npx @graypark/loophaus install --host claude-code");
      process.exit(1);
    }
    console.log(`Detected hosts: ${targets.join(", ")}\n`);
  }

  for (const t of targets) {
    const s = ctx.dryRun ? null : spinner(`Installing to ${t}...`);
    try {
      if (t === "claude-code") {
        const { install } = await import("../../platforms/claude-code/installer.mjs");
        await install({ dryRun: ctx.dryRun, force: ctx.force });
      } else if (t === "codex-cli") {
        const { install } = await import("../../platforms/codex-cli/installer.mjs");
        await install({ dryRun: ctx.dryRun, force: ctx.force, local: ctx.local });
      } else if (t === "kiro-cli") {
        const { install } = await import("../../platforms/kiro-cli/installer.mjs");
        await install({ dryRun: ctx.dryRun, force: ctx.force });
      } else {
        console.log(`Unknown host: ${t}`);
      }
    } finally {
      s?.stop();
    }
  }

  if (quiet || ctx.dryRun) return;

  // First-run welcome or upgrade notice
  const { mkdir: mk, writeFile: wf, readFile: rf } = await import("node:fs/promises");
  await mk(loophausDir, { recursive: true });

  let isFirstRun = false;
  try {
    const seen = await rf(welcomePath, "utf-8");
    // Existing install — show What's New if version changed
    if (seen.trim() !== version) {
      await wf(welcomePath, version, "utf-8");
      try {
        const changelog = await rf(join(ctx.projectRoot, "CHANGELOG.md"), "utf-8");
        const firstEntry = changelog.match(/## \[[\d.]+\][^\n]*\n([\s\S]*?)(?=\n## \[|$)/);
        if (firstEntry) {
          console.log(`\n  \x1b[36mWhat's New in v${version}:\x1b[0m`);
          const lines = firstEntry[1].trim().split("\n").slice(0, 8);
          for (const l of lines) console.log(`  ${l}`);
        }
      } catch { /* no CHANGELOG */ }
    }
  } catch {
    isFirstRun = true;
    await wf(welcomePath, version, "utf-8");
  }

  if (isFirstRun) {
    console.log(`
  \x1b[36m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m
  Welcome to \x1b[1mloophaus\x1b[0m v${version}

  Control plane for coding agents.
  Iterative dev loops with quality verification.

  Quick start:
    /loop-plan <describe your task>

  Commands:
    /loop-plan   Interview → PRD → implement → verify
    /loop        Start loop with existing PRD
    /loop-pulse  Check progress
    /loop-stop   Cancel loop

  CLI:
    loophaus benchmark    Project quality score
    loophaus config list  View settings
    loophaus upgrade      Update to latest
  \x1b[36m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m`);
  }
}
