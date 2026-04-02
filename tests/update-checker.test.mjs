import { describe, it, expect } from "vitest";
import { compareVersions, isCacheFresh, isSnoozed, getSnoozeHours } from "../core/update-checker.js";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("3.6.0", "3.6.0")).toBe(0);
  });

  it("returns -1 when current < latest", () => {
    expect(compareVersions("3.5.0", "3.6.0")).toBe(-1);
  });

  it("returns 1 when current > latest", () => {
    expect(compareVersions("3.7.0", "3.6.0")).toBe(1);
  });

  it("handles different segment counts", () => {
    expect(compareVersions("3.6", "3.6.0")).toBe(0);
    expect(compareVersions("3.6.0", "3.6.1")).toBe(-1);
  });

  it("handles major version differences", () => {
    expect(compareVersions("2.9.9", "3.0.0")).toBe(-1);
  });
});

describe("isCacheFresh", () => {
  it("returns true for recent UP_TO_DATE cache", () => {
    const cache = { checkedAt: new Date().toISOString(), status: "up_to_date", current: "3.6.0", latest: "3.6.0" };
    expect(isCacheFresh(cache, Date.now())).toBe(true);
  });

  it("returns false for stale UP_TO_DATE cache (>60min)", () => {
    const old = new Date(Date.now() - 61 * 60_000).toISOString();
    const cache = { checkedAt: old, status: "up_to_date", current: "3.6.0", latest: "3.6.0" };
    expect(isCacheFresh(cache, Date.now())).toBe(false);
  });

  it("returns true for recent UPGRADE_AVAILABLE cache", () => {
    const cache = { checkedAt: new Date().toISOString(), status: "upgrade_available", current: "3.5.0", latest: "3.6.0" };
    expect(isCacheFresh(cache, Date.now())).toBe(true);
  });

  it("returns false for stale UPGRADE_AVAILABLE cache (>720min)", () => {
    const old = new Date(Date.now() - 721 * 60_000).toISOString();
    const cache = { checkedAt: old, status: "upgrade_available", current: "3.5.0", latest: "3.6.0" };
    expect(isCacheFresh(cache, Date.now())).toBe(false);
  });
});

describe("isSnoozed", () => {
  it("returns true within snooze window (level 1 = 24h)", () => {
    const snooze = { version: "3.6.0", level: 1, snoozedAt: new Date().toISOString() };
    expect(isSnoozed(snooze, "3.6.0", Date.now())).toBe(true);
  });

  it("returns false after snooze expires", () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    const snooze = { version: "3.6.0", level: 1, snoozedAt: old };
    expect(isSnoozed(snooze, "3.6.0", Date.now())).toBe(false);
  });

  it("returns false when version changes (new release resets snooze)", () => {
    const snooze = { version: "3.5.0", level: 2, snoozedAt: new Date().toISOString() };
    expect(isSnoozed(snooze, "3.6.0", Date.now())).toBe(false);
  });

  it("level 2 snooze lasts 48h", () => {
    const within = new Date(Date.now() - 47 * 3600_000).toISOString();
    const snooze = { version: "3.6.0", level: 2, snoozedAt: within };
    expect(isSnoozed(snooze, "3.6.0", Date.now())).toBe(true);
  });

  it("level 3+ snooze lasts 7 days", () => {
    const within = new Date(Date.now() - 6 * 24 * 3600_000).toISOString();
    const snooze = { version: "3.6.0", level: 3, snoozedAt: within };
    expect(isSnoozed(snooze, "3.6.0", Date.now())).toBe(true);

    const expired = new Date(Date.now() - 8 * 24 * 3600_000).toISOString();
    const snooze2 = { version: "3.6.0", level: 5, snoozedAt: expired };
    expect(isSnoozed(snooze2, "3.6.0", Date.now())).toBe(false);
  });
});

describe("getSnoozeHours", () => {
  it("returns 24 for level 1", () => {
    expect(getSnoozeHours(1)).toBe(24);
  });

  it("returns 48 for level 2", () => {
    expect(getSnoozeHours(2)).toBe(48);
  });

  it("returns 168 (7d) for level 3+", () => {
    expect(getSnoozeHours(3)).toBe(168);
    expect(getSnoozeHours(10)).toBe(168);
  });
});
