import { exec, execFile } from "node:child_process";
import type {
  ExecException,
  ExecFileOptionsWithStringEncoding,
  ExecOptionsWithStringEncoding,
} from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

import { isWindows } from "./paths.js";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const WINDOWS_BATCH_COMMANDS = new Set(["loophaus", "npm", "npx"]);

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandError extends ExecException {
  stdout?: string;
  stderr?: string;
}

export function getDefaultShell(platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    return process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || "/bin/sh";
}

export function resolvePlatformCommand(
  command: string,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform !== "win32") return command;
  if (/[/\\]/.test(command) || /\.[A-Za-z0-9]+$/.test(command)) return command;
  if (WINDOWS_BATCH_COMMANDS.has(command)) return `${command}.cmd`;
  return command;
}

export function requiresShellExecution(
  command: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (platform !== "win32") return false;
  return /\.(cmd|bat)$/i.test(command);
}

export function getGlobalBinDir(prefix: string, platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? prefix : join(prefix, "bin");
}

export function getGlobalBinaryPath(
  prefix: string,
  binaryName: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const suffix = platform === "win32" ? ".cmd" : "";
  return join(getGlobalBinDir(prefix, platform), `${binaryName}${suffix}`);
}

function createBaseExecOptions(
  options: CommandOptions,
): ExecFileOptionsWithStringEncoding & ExecOptionsWithStringEncoding {
  return {
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeout,
    encoding: "utf8",
    windowsHide: isWindows(),
  };
}

function quoteWindowsArg(value: string): string {
  if (value.length === 0) return "\"\"";
  if (!/[\s"&|<>^()]/.test(value)) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function buildShellCommand(command: string, args: string[]): string {
  if (!isWindows()) {
    return [command, ...args].map((part) => {
      if (/^[A-Za-z0-9_./:=+-]+$/.test(part)) return part;
      return `'${part.replace(/'/g, `'\\''`)}'`;
    }).join(" ");
  }
  return [command, ...args].map(quoteWindowsArg).join(" ");
}

export async function runCommand(
  command: string,
  args: string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> {
  const resolved = resolvePlatformCommand(command);
  const execOptions = createBaseExecOptions(options);

  if (requiresShellExecution(resolved)) {
    return execAsync(buildShellCommand(resolved, args), {
      ...execOptions,
      shell: getDefaultShell(),
    });
  }

  return execFileAsync(resolved, args, execOptions);
}

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+[/~]/,   // rm -rf / or ~
  /\bcurl\b.*\|\s*\bsh\b/, // curl | sh
  /\bwget\b.*\|\s*\bsh\b/, // wget | sh
  /\beval\b/,              // eval
  />\s*\/etc\//,           // redirect to /etc/
  /\bsudo\b/,              // sudo
];

export async function runShellCommand(
  command: string,
  options: CommandOptions = {},
): Promise<CommandResult> {
  // Log command for audit trail
  if (process.env.LOOPHAUS_DEBUG === "1") {
    process.stderr.write(`[loophaus:shell] ${command}\n`);
  }
  // Warn on dangerous patterns (non-blocking)
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      process.stderr.write(`loophaus: WARNING — potentially dangerous command detected: ${command}\n`);
      break;
    }
  }
  return execAsync(command, {
    ...createBaseExecOptions(options),
    shell: getDefaultShell(),
  });
}
