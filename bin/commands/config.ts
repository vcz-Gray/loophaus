import type { CliContext } from "../cli-utils.js";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as unknown as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as unknown as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export async function run(ctx: CliContext): Promise<void> {
  const { readConfig, writeConfig } = await import("../../core/cleanup.js");
  const sub = ctx.args[1];

  const KNOWN_KEYS: Record<string, string> = {
    "cleanup.onNewPlan": "Policy when /loop-plan starts: archive | delete | keep",
    "cleanup.traceRetentionDays": "Days to keep trace data",
    "cleanup.sessionRetentionDays": "Days to keep session checkpoints",
    "updateCheck": "Check for updates on skill execution: true | false",
    "autoUpgrade": "Auto-upgrade without prompting: true | false",
  };

  if (!sub || sub === "list") {
    const config = await readConfig() as unknown as Record<string, unknown>;
    console.log("Configuration (.loophaus/config.json)");
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    for (const [key, desc] of Object.entries(KNOWN_KEYS)) {
      const val = getNestedValue(config, key);
      console.log(`  ${key.padEnd(30)} ${String(val ?? "(default)").padEnd(12)} ${desc}`);
    }
    console.log(`\nUsage: loophaus config set <key> <value>`);
    return;
  }

  if (sub === "get") {
    const key = ctx.args[2];
    if (!key) { console.log("Usage: loophaus config get <key>"); return; }
    const config = await readConfig() as unknown as Record<string, unknown>;
    const val = getNestedValue(config, key);
    console.log(val !== undefined ? String(val) : "(not set)");
    return;
  }

  if (sub === "set") {
    const key = ctx.args[3] ? ctx.args[2] : ctx.args[2];
    const value = ctx.args[3] || ctx.args[3];
    if (!key || value === undefined) { console.log("Usage: loophaus config set <key> <value>"); return; }
    const rawValue = ctx.args[3];
    if (!key || rawValue === undefined) { console.log("Usage: loophaus config set <key> <value>"); return; }

    if (!KNOWN_KEYS[key]) {
      console.log(`Warning: '${key}' is not a known config key.`);
    }

    const config = await readConfig();
    const parsed = rawValue === "true" ? true : rawValue === "false" ? false : isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
    setNestedValue(config as unknown as Record<string, unknown>, key, parsed);
    await writeConfig(config);
    console.log(`Set ${key} = ${String(parsed)}`);
    return;
  }

  console.log("Usage: loophaus config [list|get|set] [key] [value]");
}
