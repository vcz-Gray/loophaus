import type { CliContext } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { listSessions } = await import("../../core/session.js");
  const sessions = await listSessions();
  if (sessions.length === 0) { console.log("No saved sessions."); return; }
  console.log("Sessions");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  for (const s of sessions) {
    const age = Math.round((Date.now() - new Date(s.savedAt).getTime()) / 60000);
    console.log(`  ${(s as unknown as Record<string, unknown>).sessionId}  iter=${(s as unknown as Record<string, unknown>).currentIteration || 0}  ${age}m ago`);
  }
}

export async function runResume(ctx: CliContext): Promise<void> {
  const id = ctx.args[1];
  if (!id) { console.log("Usage: loophaus resume <session-id>"); return; }
  const { resumeSession } = await import("../../core/session.js");
  const state = await resumeSession(id);
  if (!state) { console.log(`Session not found: ${id}`); return; }
  console.log(`Resumed session ${id} at iteration ${state.currentIteration}`);
  console.log(`Loop is now active. The stop hook will continue from here.`);
}
