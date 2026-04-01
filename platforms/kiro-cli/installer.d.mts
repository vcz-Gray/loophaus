export function detect(): Promise<boolean>;
export function install(opts: { dryRun?: boolean; force?: boolean }): Promise<void>;
export function uninstall(opts: { dryRun?: boolean }): Promise<void>;
