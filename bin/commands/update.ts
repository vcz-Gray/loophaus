import { getGlobalBinaryPath, runCommand } from "../../lib/runtime.js";
import type { CliContext } from "../cli-utils.js";
import { spinner } from "../cli-utils.js";

export async function runUpdateCheck(_ctx: CliContext): Promise<void> {
  const { getPackageVersion } = await import("../../lib/paths.js");
  const { checkForUpdate } = await import("../../core/update-checker.js");
  const current = getPackageVersion();
  const result = await checkForUpdate(current);

  console.log("Update Check");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`  Current:  v${result.current}`);
  console.log(`  Latest:   v${result.latest}`);
  console.log(`  Status:   ${result.status}`);
  if (result.message) console.log(`  Note:     ${result.message}`);

  if (result.status === "upgrade_available") {
    console.log(`\n  \x1b[33mUpdate available: v${result.current} → v${result.latest}\x1b[0m`);
    console.log(`  Run: loophaus upgrade`);
  }
}

export async function runUpgrade(_ctx: CliContext): Promise<void> {
  const { getPackageVersion } = await import("../../lib/paths.js");
  const { checkForUpdate } = await import("../../core/update-checker.js");

  const current = getPackageVersion();
  const result = await checkForUpdate(current);

  if (result.status === "up_to_date") {
    console.log(`Already on latest version: v${current}`);
    return;
  }

  if (result.status !== "upgrade_available" && result.status !== "snoozed") {
    console.log(`No update available (status: ${result.status})`);
    return;
  }

  console.log(`Upgrading loophaus: v${result.current} → v${result.latest}`);
  const s = spinner("Installing...");
  try {
    await runCommand("npm", ["install", "-g", `@graypark/loophaus@${result.latest}`], { timeout: 120_000 });
    s.stop();
    console.log(`\u2714 Installed v${result.latest}`);

    const s2 = spinner("Reinstalling plugins...");
    try {
      const { stdout: prefixStdout } = await runCommand("npm", ["prefix", "-g"], { timeout: 30_000 });
      const globalLoophaus = getGlobalBinaryPath(prefixStdout.trim(), "loophaus");
      await runCommand(globalLoophaus, ["install", "--force"], { timeout: 60_000 });
      s2.stop();
      console.log("\u2714 Plugins reinstalled");
    } catch {
      s2.stop();
      console.log("  Note: Run 'loophaus install --force' to update plugins.");
    }

    console.log(`\n  Upgrade complete: v${result.current} → v${result.latest}`);
  } catch (err) {
    s.stop();
    console.error(`\u2718 Upgrade failed: ${(err as Error).message}`);
    console.error("  Try manually: npm install -g @graypark/loophaus@latest");
  }
}
