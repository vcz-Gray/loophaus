// platforms/base-installer.mjs
// Shared utilities for all platform installers.
import { access, mkdir, cp } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Check whether a path exists on disk.
 */
export async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

/**
 * Derive PROJECT_ROOT from a caller's import.meta.url.
 * All platform installers live at platforms/<name>/installer.mjs,
 * so the root is two directories up.
 */
export function getProjectRoot(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  return resolve(dirname(__filename), "../..");
}

/**
 * Print a standard installer banner.
 * @param {string} platformName  e.g. "Claude Code", "Codex CLI", "Kiro CLI"
 * @param {object} opts
 * @param {boolean} opts.dryRun
 * @param {string}  opts.target   path shown as Target:
 * @param {string}  [opts.mode]   optional extra line (e.g. "local (.codex/)")
 * @param {string}  [opts.version] version string to display
 */
export function printBanner(platformName, { dryRun = false, target, mode, version } = {}) {
  console.log("");
  console.log(`loophaus installer — ${platformName}${dryRun ? " (DRY RUN)" : ""}`);
  if (version) console.log(`Version: ${version}`);
  if (mode) console.log(`Mode: ${mode}`);
  console.log(`Target: ${target}`);
  console.log("");
}

/**
 * Guard against overwriting an existing installation.
 * Returns true if installation should proceed, false if it should abort.
 */
export async function checkExisting(existingPath, { dryRun = false, force = false } = {}) {
  if (!force && await fileExists(existingPath)) {
    if (dryRun) {
      console.log("  ! Existing installation found (would prompt for --force)");
      return true; // dry-run continues
    } else {
      console.log("  ! Existing installation found. Use --force to overwrite.");
      return false;
    }
  }
  return true;
}

/**
 * Copy a list of directories from projectRoot to destDir, respecting dryRun.
 * Each entry can be a string (same name for src and dest) or
 * an object { src, dest } for remapping.
 *
 * @param {Array<string | {src: string, dest: string}>} dirs
 * @param {string} projectRoot
 * @param {string} destDir
 * @param {object} opts
 * @param {boolean} opts.dryRun
 */
export async function copyDirs(dirs, projectRoot, destDir, { dryRun = false } = {}) {
  for (const entry of dirs) {
    const srcName = typeof entry === "string" ? entry : entry.src;
    const destName = typeof entry === "string" ? entry : entry.dest;
    const src = join(projectRoot, srcName);
    if (!(await fileExists(src))) continue;
    const dest = join(destDir, destName);
    console.log(`  > Copy ${srcName}/ -> ${dest}`);
    if (!dryRun) {
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  }
}

/**
 * Copy a list of individual files from projectRoot to destDir, respecting dryRun.
 *
 * @param {string[]} files
 * @param {string}   projectRoot
 * @param {string}   destDir
 * @param {object}   opts
 * @param {boolean}  opts.dryRun
 */
export async function copyFiles(files, projectRoot, destDir, { dryRun = false } = {}) {
  for (const file of files) {
    const src = join(projectRoot, file);
    if (await fileExists(src)) {
      console.log(`  > Copy ${file}`);
      if (!dryRun) await cp(src, join(destDir, file));
    }
  }
}

/**
 * Print the standard completion footer.
 * @param {object} opts
 * @param {boolean}  opts.dryRun
 * @param {string[]} [opts.successLines]  lines to print after the success check mark
 */
export function printResult({ dryRun = false, successLines = [] } = {}) {
  console.log("");
  if (dryRun) {
    console.log("  \u2714 Dry run complete." + (successLines.length === 0 ? "" : " No files were modified."));
  } else {
    for (const line of successLines) {
      console.log(line);
    }
  }
  console.log("");
}
