// core/logger.ts — Structured logging with pluggable transports
// Zero dependencies. Transports are simple functions for easy testing.

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
  ts: number;
}

export type LogTransport = (entry: LogEntry) => void;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Console transport: human-readable stderr output.
 * Format: [loophaus:level] event — key=value key=value
 *
 * Respects:
 *   --quiet  (LOOPHAUS_QUIET=1): suppress info and debug
 *   LOOPHAUS_DEBUG=1: show debug-level messages
 *
 * Without LOOPHAUS_DEBUG, the minimum level is "info".
 * With --quiet, the minimum level is "warn".
 */
export function consoleTransport(entry: LogEntry): void {
  const quiet = process.env.LOOPHAUS_QUIET === "1";
  const debug = process.env.LOOPHAUS_DEBUG === "1";

  let minLevel: LogLevel;
  if (quiet) {
    minLevel = "warn";
  } else if (debug) {
    minLevel = "debug";
  } else {
    minLevel = "info";
  }

  if (LEVEL_ORDER[entry.level] < LEVEL_ORDER[minLevel]) return;

  const kvParts: string[] = [];
  if (entry.data) {
    for (const [key, value] of Object.entries(entry.data)) {
      kvParts.push(`${key}=${formatValue(value)}`);
    }
  }

  const suffix = kvParts.length > 0 ? ` \u2014 ${kvParts.join(" ")}` : "";
  process.stderr.write(`[loophaus:${entry.level}] ${entry.event}${suffix}\n`);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Buffer transport: stores entries in memory.
 * Useful for plugin mode or testing.
 */
export function createBufferTransport(): {
  transport: LogTransport;
  getEntries: () => LogEntry[];
} {
  const entries: LogEntry[] = [];
  return {
    transport(entry: LogEntry): void {
      entries.push(entry);
    },
    getEntries(): LogEntry[] {
      return [...entries];
    },
  };
}

export interface Logger {
  debug: (event: string, data?: Record<string, unknown>) => void;
  info: (event: string, data?: Record<string, unknown>) => void;
  warn: (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, data?: Record<string, unknown>) => void;
}

/**
 * Logger factory — dispatches log entries to all provided transports.
 */
export function createLogger(transports: LogTransport[]): Logger {
  function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = { level, event, ts: Date.now(), ...(data !== undefined && { data }) };
    for (const transport of transports) {
      try {
        transport(entry);
      } catch {
        // Transports must not break the caller
      }
    }
  }

  return {
    debug: (event, data) => emit("debug", event, data),
    info: (event, data) => emit("info", event, data),
    warn: (event, data) => emit("warn", event, data),
    error: (event, data) => emit("error", event, data),
  };
}
