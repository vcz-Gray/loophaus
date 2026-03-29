// platforms/claude-code/adapter.mjs

export const name = "claude-code";
export const platform = "claude-code";

export function parseInput(raw) {
  const input = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    session_id: input.session_id || "",
    transcript_path: input.transcript_path || null,
    cwd: input.cwd || process.cwd(),
    stop_hook_active: input.stop_hook_active || false,
    last_assistant_message: input.last_assistant_message || "",
  };
}

export function renderOutput(result) {
  if (result.output) return JSON.stringify(result.output);
  return "";
}
