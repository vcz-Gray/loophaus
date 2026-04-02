import { describe, expect, it } from "vitest";

import {
  getDefaultShell,
  getGlobalBinaryPath,
  requiresShellExecution,
  resolvePlatformCommand,
} from "../lib/runtime.js";

describe("runtime helpers", () => {
  it("resolvePlatformCommand adds .cmd for known Windows shims", () => {
    expect(resolvePlatformCommand("npm", "win32")).toBe("npm.cmd");
    expect(resolvePlatformCommand("npx", "win32")).toBe("npx.cmd");
    expect(resolvePlatformCommand("loophaus", "win32")).toBe("loophaus.cmd");
  });

  it("resolvePlatformCommand leaves unknown or explicit commands unchanged", () => {
    expect(resolvePlatformCommand("git", "win32")).toBe("git");
    expect(resolvePlatformCommand("C:\\tools\\loophaus.cmd", "win32")).toBe("C:\\tools\\loophaus.cmd");
    expect(resolvePlatformCommand("npm", "linux")).toBe("npm");
  });

  it("requiresShellExecution only applies to Windows batch files", () => {
    expect(requiresShellExecution("npm.cmd", "win32")).toBe(true);
    expect(requiresShellExecution("script.bat", "win32")).toBe(true);
    expect(requiresShellExecution("git", "win32")).toBe(false);
    expect(requiresShellExecution("npm.cmd", "linux")).toBe(false);
  });

  it("getGlobalBinaryPath respects platform bin layout", () => {
    expect(getGlobalBinaryPath("C:\\Users\\me\\AppData\\Roaming\\npm", "loophaus", "win32"))
      .toBe("C:\\Users\\me\\AppData\\Roaming\\npm/loophaus.cmd");
    expect(getGlobalBinaryPath("/usr/local", "loophaus", "linux"))
      .toBe("/usr/local/bin/loophaus");
  });

  it("getDefaultShell picks cmd on Windows", () => {
    expect(getDefaultShell("win32")).toContain("cmd");
  });
});
