// platforms/kiro-cli/adapter.mjs

export const name = "kiro-cli";
export const platform = "kiro-cli";

export function parseInput(raw) {
  const input = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    session_id: input.session_id || "",
    transcript_path: input.transcript_path || null,
    cwd: input.cwd || process.cwd(),
    stop_hook_active: input.stop_hook_active || false,
    last_assistant_message: input.last_assistant_message || "",
    hook_event_name: input.hook_event_name || "stop",
  };
}

export function renderOutput(result) {
  if (result.output) return JSON.stringify(result.output);
  return "";
}
