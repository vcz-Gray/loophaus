export function detect(): Promise<boolean>;
export function install(opts: { dryRun?: boolean; force?: boolean; local?: boolean }): Promise<void>;
