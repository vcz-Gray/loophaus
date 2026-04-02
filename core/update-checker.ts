// core/update-checker.ts
// npm registry version check with cache + snooze (gstack-style)

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { get } from "node:https";

const REGISTRY_URL = "https://registry.npmjs.org/@graypark/loophaus/latest";
const FETCH_TIMEOUT_MS = 5_000;

// Cache TTL in minutes
const TTL_UP_TO_DATE = 60;
const TTL_UPGRADE_AVAILABLE = 720;

// Snooze durations in hours
const SNOOZE_HOURS = [24, 48, 168]; // level 1, 2, 3+

export type UpdateStatus = "up_to_date" | "upgrade_available" | "snoozed" | "disabled" | "error";

export interface UpdateCheckResult {
  status: UpdateStatus;
  current: string;
  latest: string;
  message?: string;
}

export interface UpdateCache {
  checkedAt: string;
  status: "up_to_date" | "upgrade_available";
  current: string;
  latest: string;
}

export interface SnoozeState {
  version: string;
  level: number;
  snoozedAt: string;
}

export interface UpdateConfig {
  updateCheck?: boolean;
  autoUpgrade?: boolean;
}

function getLoophausDir(cwd?: string): string {
  return join(cwd || process.env.HOME || "~", ".loophaus");
}

function getCachePath(cwd?: string): string {
  return join(getLoophausDir(cwd), "update-cache.json");
}

function getSnoozePath(cwd?: string): string {
  return join(getLoophausDir(cwd), "update-snoozed.json");
}

// --- Pure functions ---

export function compareVersions(current: string, latest: string): -1 | 0 | 1 {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

export function isCacheFresh(cache: UpdateCache, nowMs: number): boolean {
  const age = (nowMs - new Date(cache.checkedAt).getTime()) / 60_000;
  const ttl = cache.status === "up_to_date" ? TTL_UP_TO_DATE : TTL_UPGRADE_AVAILABLE;
  return age < ttl;
}

export function isSnoozed(snooze: SnoozeState, version: string, nowMs: number): boolean {
  if (snooze.version !== version) return false; // new version resets snooze
  const level = Math.min(snooze.level, SNOOZE_HOURS.length) - 1;
  const durationMs = (SNOOZE_HOURS[level] ?? SNOOZE_HOURS[SNOOZE_HOURS.length - 1]) * 3600_000;
  const elapsed = nowMs - new Date(snooze.snoozedAt).getTime();
  return elapsed < durationMs;
}

export function getSnoozeHours(level: number): number {
  const idx = Math.min(level, SNOOZE_HOURS.length) - 1;
  return SNOOZE_HOURS[idx] ?? SNOOZE_HOURS[SNOOZE_HOURS.length - 1];
}

// --- I/O functions ---

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), FETCH_TIMEOUT_MS);
    try {
      const req = get(REGISTRY_URL, { timeout: FETCH_TIMEOUT_MS }, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          clearTimeout(timer);
          try {
            const pkg = JSON.parse(data) as { version?: string };
            resolve(pkg.version || null);
          } catch {
            resolve(null);
          }
        });
      });
      req.on("error", () => { clearTimeout(timer); resolve(null); });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

export async function readConfig(cwd?: string): Promise<UpdateConfig> {
  const configPath = join(cwd || process.cwd(), ".loophaus", "config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw) as UpdateConfig;
  } catch {
    return {};
  }
}

export async function checkForUpdate(currentVersion: string, homeCwd?: string): Promise<UpdateCheckResult> {
  const dir = getLoophausDir(homeCwd);
  const cachePath = getCachePath(homeCwd);
  const snoozePath = getSnoozePath(homeCwd);
  const now = Date.now();

  // Check config
  const config = await readConfig(homeCwd);
  if (config.updateCheck === false) {
    return { status: "disabled", current: currentVersion, latest: currentVersion };
  }

  // Check cache
  const cache = await readJson<UpdateCache>(cachePath);
  if (cache && isCacheFresh(cache, now)) {
    if (cache.status === "up_to_date") {
      return { status: "up_to_date", current: currentVersion, latest: cache.latest };
    }
    // Cache says upgrade available — check snooze
    const snooze = await readJson<SnoozeState>(snoozePath);
    if (snooze && isSnoozed(snooze, cache.latest, now)) {
      const hours = getSnoozeHours(snooze.level);
      return { status: "snoozed", current: currentVersion, latest: cache.latest, message: `Snoozed for ${hours}h (level ${snooze.level})` };
    }
    return { status: "upgrade_available", current: currentVersion, latest: cache.latest };
  }

  // Fetch from registry
  const latest = await fetchLatestVersion();
  if (!latest) {
    return { status: "error", current: currentVersion, latest: currentVersion, message: "Could not reach npm registry" };
  }

  const cmp = compareVersions(currentVersion, latest);
  const status = cmp < 0 ? "upgrade_available" : "up_to_date";

  // Write cache
  await mkdir(dir, { recursive: true });
  const newCache: UpdateCache = { checkedAt: new Date().toISOString(), status, current: currentVersion, latest };
  await writeJson(cachePath, newCache);

  if (status === "upgrade_available") {
    // Check snooze for the new version
    const snooze = await readJson<SnoozeState>(snoozePath);
    if (snooze && isSnoozed(snooze, latest, now)) {
      const hours = getSnoozeHours(snooze.level);
      return { status: "snoozed", current: currentVersion, latest, message: `Snoozed for ${hours}h (level ${snooze.level})` };
    }
  }

  return { status, current: currentVersion, latest };
}

export async function snoozeUpdate(version: string, homeCwd?: string): Promise<SnoozeState> {
  const snoozePath = getSnoozePath(homeCwd);
  const existing = await readJson<SnoozeState>(snoozePath);

  let level = 1;
  if (existing && existing.version === version) {
    level = existing.level + 1;
  }

  const snooze: SnoozeState = {
    version,
    level,
    snoozedAt: new Date().toISOString(),
  };

  await writeJson(snoozePath, snooze);
  return snooze;
}

export async function getUpdateStatus(currentVersion: string, homeCwd?: string): Promise<string> {
  const result = await checkForUpdate(currentVersion, homeCwd);
  switch (result.status) {
    case "up_to_date": return "";
    case "upgrade_available": return `UPGRADE_AVAILABLE ${result.current} ${result.latest}`;
    case "snoozed": return "";
    case "disabled": return "";
    case "error": return "";
    default: return "";
  }
}
