// core/state-migration.ts
// Forward-only schema migration for .loophaus/state.json

export const CURRENT_SCHEMA_VERSION = 2;

export interface Migration {
  from: number;
  to: number;
  migrate: (state: Record<string, unknown>) => Record<string, unknown>;
}

// Migration chain: each step transforms state from version N to N+1
const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    migrate: (state) => ({
      ...state,
      schemaVersion: 2,
      // v2 adds qualityThreshold, maxRefineAttempts, qualityConfig with defaults
      qualityThreshold: (state.qualityThreshold as number) ?? 80,
      maxRefineAttempts: (state.maxRefineAttempts as number) ?? 3,
      qualityConfig: state.qualityConfig ?? null,
    }),
  },
];

export function getSchemaVersion(state: Record<string, unknown>): number {
  if (typeof state.schemaVersion === "number") return state.schemaVersion;
  return 1; // Pre-versioning state files are version 1
}

export function needsMigration(state: Record<string, unknown>): boolean {
  return getSchemaVersion(state) < CURRENT_SCHEMA_VERSION;
}

export function migrateState(state: Record<string, unknown>): Record<string, unknown> {
  let current = { ...state };
  let version = getSchemaVersion(current);

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find(m => m.from === version);
    if (!migration) {
      throw new Error(`No migration path from schema version ${version} to ${version + 1}`);
    }
    current = migration.migrate(current);
    version = migration.to;
  }

  return current;
}
