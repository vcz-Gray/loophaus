import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const host = ctx.args.includes("--claude") ? "claude-code"
    : ctx.args.includes("--kiro") ? "kiro-cli"
    : ctx.getFlag("--host") || null;

  if (host === "claude-code" || ctx.args.includes("--claude")) {
    const { uninstall } = await import("../uninstall.js");
    await uninstall({ dryRun: ctx.dryRun, claude: true });
  } else if (host === "kiro-cli" || ctx.args.includes("--kiro")) {
    const { uninstall } = await import("../../platforms/kiro-cli/installer.mjs");
    await uninstall({ dryRun: ctx.dryRun });
  } else {
    const { uninstall } = await import("../uninstall.js");
    await uninstall({ dryRun: ctx.dryRun, local: ctx.local });
  }
}
