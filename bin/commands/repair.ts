// bin/commands/repair.ts — Validate and fix .loophaus/ state

import type { CliContext } from "../cli-utils.js";

export async function run(ctx: CliContext): Promise<void> {
  const { readFile, writeFile, readdir, rm, mkdir, stat, rename } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { validateState, validateLoopConfig } = await import("../../core/validate.js");
  const { needsMigration, migrateState } = await import("../../core/state-migration.js");

  const cwd = process.cwd();
  const loophausDir = join(cwd, ".loophaus");
  const statePath = join(loophausDir, "state.json");
  const configPath = join(loophausDir, "config.json");
  const sessionsDir = join(loophausDir, "sessions");
  const lockDir = statePath + ".lock";

  const issues: string[] = [];
  const fixed: string[] = [];

  // -- Step 1: Check .loophaus/ directory exists --
  try {
    const s = await stat(loophausDir);
    if (!s.isDirectory()) {
      console.log("\u2718 .loophaus exists but is not a directory. Cannot repair.");
      return;
    }
  } catch {
    console.log("\u2718 .loophaus/ directory not found.");
    if (ctx.dryRun) {
      console.log("  [dry-run] Would create .loophaus/");
    } else {
      await mkdir(loophausDir, { recursive: true });
      fixed.push("Created .loophaus/ directory");
    }
    // Nothing else to repair — it was missing entirely
    printSummary(issues, fixed);
    return;
  }

  // -- Step 2: Validate state.json --
  try {
    const raw = await readFile(statePath, "utf-8");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      issues.push("state.json contains invalid JSON");
      if (!ctx.dryRun) {
        const backupPath = statePath + ".bak";
        await rename(statePath, backupPath);
        const defaults = { active: false, prompt: "", maxIterations: 20, currentIteration: 0, schemaVersion: 2 };
        await writeFile(statePath, JSON.stringify(defaults, null, 2), "utf-8");
        fixed.push("Backed up corrupted state.json → state.json.bak, reset to defaults");
      } else {
        fixed.push("[dry-run] Would backup and reset corrupted state.json");
      }
      parsed = {}; // skip further validation
    }

    if (Object.keys(parsed).length > 0) {
      // Check if migration is needed
      if (needsMigration(parsed)) {
        issues.push("state.json needs schema migration");
        if (!ctx.dryRun) {
          const migrated = migrateState(parsed);
          await writeFile(statePath, JSON.stringify(migrated, null, 2), "utf-8");
          fixed.push("Migrated state.json to latest schema version");
        } else {
          fixed.push("[dry-run] Would migrate state.json schema");
        }
      } else {
        // Validate schema
        const result = validateState(parsed);
        if (!result.valid) {
          issues.push(`state.json validation errors: ${result.errors.join(", ")}`);
        }
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // state.json doesn't exist — that's fine, nothing to repair
    } else {
      issues.push(`Could not read state.json: ${(err as Error).message}`);
    }
  }

  // -- Step 3: Check for stale locks --
  try {
    const lockStat = await stat(lockDir);
    if (lockStat.isDirectory()) {
      const pidFilePath = join(lockDir, "pid");
      let isStale = false;
      try {
        const pidRaw = await readFile(pidFilePath, "utf-8");
        const pidData = JSON.parse(pidRaw) as { pid: number; ts: number };
        const age = Date.now() - pidData.ts;
        if (age > 60_000) {
          isStale = true;
        } else {
          // Check if process is alive
          try {
            process.kill(pidData.pid, 0);
          } catch {
            isStale = true;
          }
        }
      } catch {
        isStale = true; // can't read pid file → stale
      }

      if (isStale) {
        issues.push("Stale lock detected (state.json.lock/)");
        if (!ctx.dryRun) {
          await rm(lockDir, { recursive: true, force: true });
          fixed.push("Removed stale lock directory");
        } else {
          fixed.push("[dry-run] Would remove stale lock directory");
        }
      }
    }
  } catch {
    // No lock dir — that's expected
  }

  // -- Step 4: Check sessions/ for corrupted checkpoints --
  try {
    const sessionFiles = await readdir(sessionsDir);
    for (const file of sessionFiles) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(sessionsDir, file);
      try {
        const raw = await readFile(filePath, "utf-8");
        JSON.parse(raw);
      } catch {
        issues.push(`Corrupted session checkpoint: ${file}`);
        if (!ctx.dryRun) {
          await rm(filePath);
          fixed.push(`Removed corrupted session: ${file}`);
        } else {
          fixed.push(`[dry-run] Would remove corrupted session: ${file}`);
        }
      }
    }
  } catch {
    // sessions/ doesn't exist — fine
  }

  // -- Step 5: Validate config.json --
  try {
    const raw = await readFile(configPath, "utf-8");
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const result = validateLoopConfig(parsed);
      if (!result.valid) {
        issues.push(`config.json validation errors: ${result.errors.join(", ")}`);
      }
    } catch {
      issues.push("config.json contains invalid JSON");
      if (!ctx.dryRun) {
        const backupPath = configPath + ".bak";
        await rename(configPath, backupPath);
        const defaultConfig = { cleanup: { onNewPlan: "keep", traceRetentionDays: 30, sessionRetentionDays: 7 } };
        await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
        fixed.push("Backed up corrupted config.json → config.json.bak, reset to defaults");
      } else {
        fixed.push("[dry-run] Would backup and reset corrupted config.json");
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // config.json doesn't exist — that's fine
    } else {
      issues.push(`Could not read config.json: ${(err as Error).message}`);
    }
  }

  // -- Step 6: Report --
  printSummary(issues, fixed);
}

function printSummary(issues: string[], fixed: string[]): void {
  console.log("Repair Summary");
  console.log("\u2500".repeat(36));
  if (issues.length === 0 && fixed.length === 0) {
    console.log("  \u2714 .loophaus/ state is healthy — no issues found.");
    return;
  }
  if (issues.length > 0) {
    console.log(`  Issues found: ${issues.length}`);
    for (const issue of issues) {
      console.log(`    \u2022 ${issue}`);
    }
  }
  if (fixed.length > 0) {
    console.log(`  Actions taken: ${fixed.length}`);
    for (const fix of fixed) {
      console.log(`    \u2714 ${fix}`);
    }
  }
}
