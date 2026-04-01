import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getLastAssistantText, hasPendingStories } from "../core/io-helpers.mjs";

describe("getLastAssistantText", () => {
  it("returns empty string for null path", async () => {
    expect(await getLastAssistantText(null)).toBe("");
    expect(await getLastAssistantText("")).toBe("");
  });

  it("returns empty string for non-existent file", async () => {
    expect(await getLastAssistantText("/nonexistent/path.jsonl")).toBe("");
  });

  it("extracts text from assistant message with content array", async () => {
    const dir = await mkdtemp(join(tmpdir(), "io-test-"));
    const fp = join(dir, "transcript.jsonl");
    const lines = [
      JSON.stringify({ role: "user", content: [{ type: "text", text: "hello" }] }),
      JSON.stringify({ role: "assistant", message: { content: [{ type: "text", text: "world" }] } }),
    ];
    await writeFile(fp, lines.join("\n"), "utf-8");
    expect(await getLastAssistantText(fp)).toBe("world");
    await rm(dir, { recursive: true });
  });

  it("extracts text from assistant message with string content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "io-test-"));
    const fp = join(dir, "transcript.jsonl");
    const lines = [
      JSON.stringify({ role: "assistant", content: "direct string" }),
    ];
    await writeFile(fp, lines.join("\n"), "utf-8");
    expect(await getLastAssistantText(fp)).toBe("direct string");
    await rm(dir, { recursive: true });
  });

  it("returns last assistant text when multiple exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "io-test-"));
    const fp = join(dir, "transcript.jsonl");
    const lines = [
      JSON.stringify({ role: "assistant", content: "first" }),
      JSON.stringify({ role: "assistant", content: "second" }),
    ];
    await writeFile(fp, lines.join("\n"), "utf-8");
    expect(await getLastAssistantText(fp)).toBe("second");
    await rm(dir, { recursive: true });
  });
});

describe("hasPendingStories", () => {
  it("returns true when pending stories exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "io-test-"));
    await writeFile(join(dir, "prd.json"), JSON.stringify({
      userStories: [
        { id: "US-001", passes: false },
        { id: "US-002", passes: true },
      ],
    }), "utf-8");
    expect(await hasPendingStories(dir)).toBe(true);
    await rm(dir, { recursive: true });
  });

  it("returns false when all stories pass", async () => {
    const dir = await mkdtemp(join(tmpdir(), "io-test-"));
    await writeFile(join(dir, "prd.json"), JSON.stringify({
      userStories: [{ id: "US-001", passes: true }],
    }), "utf-8");
    expect(await hasPendingStories(dir)).toBe(false);
    await rm(dir, { recursive: true });
  });

  it("returns false when prd.json does not exist", async () => {
    expect(await hasPendingStories("/nonexistent")).toBe(false);
  });
});
