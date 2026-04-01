import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { STRATEGIES, mergeSequential, mergeSquash, mergeCherryPick, merge } from "../core/merge-strategy.js";

function mockExecFile(impl) {
  execFile.mockImplementation((cmd, args, cb) => {
    if (typeof cb !== "function") {
      // promisify wraps as (cmd, args) → Promise, actual callback is injected by promisify
      // We need to handle the promisified version
    }
    try {
      const result = impl(cmd, args);
      cb(null, { stdout: result || "", stderr: "" });
    } catch (err) {
      cb(err);
    }
  });
}

beforeEach(() => {
  execFile.mockReset();
});

describe("STRATEGIES", () => {
  it("exports three strategy descriptions", () => {
    expect(Object.keys(STRATEGIES)).toEqual(["sequential", "cherry-pick", "squash"]);
    for (const desc of Object.values(STRATEGIES)) {
      expect(typeof desc).toBe("string");
    }
  });
});

describe("mergeSequential", () => {
  it("merges branches in order", async () => {
    mockExecFile(() => "");
    const results = await mergeSequential(["branch-a", "branch-b"]);
    expect(results).toEqual([
      { branch: "branch-a", status: "merged" },
      { branch: "branch-b", status: "merged" },
    ]);
  });

  it("stops and aborts on conflict", async () => {
    let callCount = 0;
    mockExecFile((cmd, args) => {
      if (args[0] === "merge" && args[1] === "branch-b" && args[2] === "--no-edit") {
        throw new Error("CONFLICT");
      }
      return "";
    });
    const results = await mergeSequential(["branch-a", "branch-b", "branch-c"]);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("merged");
    expect(results[1]).toMatchObject({ branch: "branch-b", status: "conflict" });
  });

  it("returns empty array for empty branches", async () => {
    mockExecFile(() => "");
    const results = await mergeSequential([]);
    expect(results).toEqual([]);
  });
});

describe("mergeSquash", () => {
  it("squash merges each branch", async () => {
    mockExecFile(() => "");
    const results = await mergeSquash(["feat-1", "feat-2"]);
    expect(results).toEqual([
      { branch: "feat-1", status: "squashed" },
      { branch: "feat-2", status: "squashed" },
    ]);
  });

  it("stops on squash conflict", async () => {
    mockExecFile((cmd, args) => {
      if (args.includes("--squash") && args.includes("feat-2")) {
        throw new Error("CONFLICT");
      }
      return "";
    });
    const results = await mergeSquash(["feat-1", "feat-2"]);
    expect(results[1]).toMatchObject({ status: "conflict" });
  });
});

describe("mergeCherryPick", () => {
  it("cherry-picks commits from branch", async () => {
    mockExecFile((cmd, args) => {
      if (args[0] === "log") return "abc123\ndef456\n";
      return "";
    });
    const results = await mergeCherryPick(["feat-1"]);
    expect(results).toEqual([{ branch: "feat-1", status: "cherry-picked", commits: 2 }]);
  });

  it("handles branch with no commits", async () => {
    mockExecFile((cmd, args) => {
      if (args[0] === "log") return "";
      return "";
    });
    const results = await mergeCherryPick(["empty-branch"]);
    expect(results).toEqual([{ branch: "empty-branch", status: "cherry-picked", commits: 0 }]);
  });
});

describe("merge (dispatcher)", () => {
  it("dispatches to correct strategy", async () => {
    mockExecFile(() => "");
    const results = await merge("sequential", ["b1"]);
    expect(results[0].status).toBe("merged");
  });

  it("throws on unknown strategy", async () => {
    await expect(merge("rebase", ["b1"])).rejects.toThrow("Unknown merge strategy: rebase");
  });
});
