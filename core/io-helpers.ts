import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DEBUG = process.env.LOOPHAUS_DEBUG === "1";

function debug(msg: string): void {
  if (DEBUG) process.stderr.write(`[loophaus:debug] ${msg}\n`);
}

function isFileNotFound(err: unknown): boolean {
  return err != null && typeof err === "object" && ("code" in err) && ((err as { code: string }).code === "ENOENT" || (err as { code: string }).code === "ENOTDIR");
}

interface TranscriptContent {
  type: string;
  text?: string;
}

interface TranscriptEntry {
  role?: string;
  message?: { content?: TranscriptContent[] | string };
  content?: TranscriptContent[] | string;
}

export async function getLastAssistantText(transcriptPath?: string): Promise<string> {
  if (!transcriptPath) return "";
  try {
    const raw = await readFile(transcriptPath, "utf-8");
    const lines = raw.trim().split("\n");
    const recent = lines.filter((line) => {
      try { return (JSON.parse(line) as TranscriptEntry).role === "assistant"; } catch { return false; }
    }).slice(-100);
    for (let i = recent.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(recent[i]) as TranscriptEntry;
        const contents = obj.message?.content || obj.content;
        if (Array.isArray(contents)) {
          for (let j = contents.length - 1; j >= 0; j--) {
            if (contents[j].type === "text" && contents[j].text) return contents[j].text!;
          }
        } else if (typeof contents === "string") return contents;
      } catch { /* skip malformed line */ }
    }
  } catch (err) {
    if (isFileNotFound(err)) {
      debug(`Transcript not found: ${transcriptPath}`);
      return "";
    }
    throw new Error(`Failed to read transcript ${transcriptPath}: ${(err as Error).message}`);
  }
  return "";
}

interface PrdStory {
  passes: boolean;
}

interface Prd {
  userStories?: PrdStory[];
}

export async function hasPendingStories(cwd?: string): Promise<boolean> {
  const prdPath = join(cwd || process.cwd(), "prd.json");
  try {
    const raw = await readFile(prdPath, "utf-8");
    const prd = JSON.parse(raw) as Prd;
    return Array.isArray(prd.userStories) && prd.userStories.some((s) => s.passes === false);
  } catch (err) {
    if (isFileNotFound(err)) {
      debug(`prd.json not found at ${prdPath}`);
      return false;
    }
    throw new Error(`Failed to read prd.json at ${prdPath}: ${(err as Error).message}`);
  }
}
