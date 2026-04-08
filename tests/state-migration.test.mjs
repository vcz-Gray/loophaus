import { describe, it, expect } from "vitest";
import { getSchemaVersion, needsMigration, migrateState, CURRENT_SCHEMA_VERSION } from "../core/state-migration.js";

describe("getSchemaVersion", () => {
  it("returns 1 for state without schemaVersion", () => {
    expect(getSchemaVersion({ active: false })).toBe(1);
  });

  it("returns the schemaVersion if present", () => {
    expect(getSchemaVersion({ schemaVersion: 2 })).toBe(2);
  });
});

describe("needsMigration", () => {
  it("returns true for version 1", () => {
    expect(needsMigration({ active: false })).toBe(true);
  });

  it("returns false for current version", () => {
    expect(needsMigration({ schemaVersion: CURRENT_SCHEMA_VERSION })).toBe(false);
  });
});

describe("migrateState", () => {
  it("migrates v1 → v2 adding quality fields", () => {
    const v1 = { active: true, prompt: "test", currentIteration: 5 };
    const v2 = migrateState(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.qualityThreshold).toBe(80);
    expect(v2.maxRefineAttempts).toBe(3);
    expect(v2.qualityConfig).toBeNull();
  });

  it("preserves existing quality fields during migration", () => {
    const v1 = { active: true, qualityThreshold: 90, maxRefineAttempts: 5 };
    const v2 = migrateState(v1);
    expect(v2.qualityThreshold).toBe(90);
    expect(v2.maxRefineAttempts).toBe(5);
  });

  it("returns unchanged state at current version", () => {
    const current = { schemaVersion: CURRENT_SCHEMA_VERSION, active: false };
    const result = migrateState(current);
    expect(result).toEqual(current);
  });
});
