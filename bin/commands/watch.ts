import type { CliContext } from "../cli-utils.js";

export async function run(_ctx: CliContext): Promise<void> {
  const { getTracePath } = await import("../../core/event-logger.js");
  const { watch: fsWatch } = await import("node:fs");
  const { readFile, stat } = await import("node:fs/promises");
  const tracePath = getTracePath();

  console.log(`Watching ${tracePath}...`);
  console.log("(Ctrl+C to stop)\n");

  let lastSize = 0;
  try {
    const s = await stat(tracePath);
    lastSize = s.size;
  } catch { /* file doesn't exist yet */ }

  const COLORS: Record<string, string> = {
    iteration: "\x1b[36m",
    stop: "\x1b[31m",
    continue: "\x1b[32m",
    error: "\x1b[31m",
    cost: "\x1b[33m",
    state_change: "\x1b[35m",
    verify_script: "\x1b[32m",
    verify_failed: "\x1b[31m",
    story_complete: "\x1b[32m",
    loop_start: "\x1b[36m",
    loop_end: "\x1b[36m",
  };
  const RESET = "\x1b[0m";

  function printEvent(line: string): void {
    try {
      const e = JSON.parse(line) as unknown as Record<string, unknown>;
      const color = COLORS[e.event as string] || "";
      const time = e.ts ? new Date(e.ts as string).toLocaleTimeString() : "";
      const detail = e.iteration ? ` iter=${e.iteration}` : e.reason ? ` reason=${e.reason}` : "";
      console.log(`${color}[${time}] ${e.event}${detail}${RESET}`);
    } catch { /* skip malformed */ }
  }

  try {
    const raw = await readFile(tracePath, "utf-8");
    const lines = raw.trim().split("\n").slice(-20);
    for (const line of lines) printEvent(line);
    if (lines.length > 0) console.log("--- live ---\n");
  } catch { /* no file yet */ }

  const { dirname: pathDirname } = await import("node:path");
  const dir = pathDirname(tracePath);
  try {
    fsWatch(dir, { recursive: false }, async () => {
      try {
        const s = await stat(tracePath);
        if (s.size > lastSize) {
          const raw = await readFile(tracePath, "utf-8");
          const lines = raw.trim().split("\n");
          const newLines: string[] = [];
          let pos = 0;
          for (const line of lines) {
            pos += Buffer.byteLength(line + "\n");
            if (pos > lastSize) newLines.push(line);
          }
          for (const line of newLines) printEvent(line);
          lastSize = s.size;
        }
      } catch { /* read error */ }
    });
  } catch {
    console.log("Cannot watch file. Make sure .loophaus/ directory exists.");
    process.exit(1);
  }

  process.stdin.resume();
}
