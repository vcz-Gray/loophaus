import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLogger, createBufferTransport, consoleTransport } from "../core/logger.js";

describe("createLogger", () => {
  it("dispatches entries to all transports", () => {
    const buf1 = createBufferTransport();
    const buf2 = createBufferTransport();
    const log = createLogger([buf1.transport, buf2.transport]);

    log.info("test-event", { key: "value" });

    expect(buf1.getEntries()).toHaveLength(1);
    expect(buf2.getEntries()).toHaveLength(1);
    expect(buf1.getEntries()[0].event).toBe("test-event");
    expect(buf2.getEntries()[0].data).toEqual({ key: "value" });
  });

  it("emits correct log levels", () => {
    const buf = createBufferTransport();
    const log = createLogger([buf.transport]);

    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    const entries = buf.getEntries();
    expect(entries).toHaveLength(4);
    expect(entries.map(e => e.level)).toEqual(["debug", "info", "warn", "error"]);
  });

  it("includes timestamp on each entry", () => {
    const buf = createBufferTransport();
    const log = createLogger([buf.transport]);
    const before = Date.now();

    log.info("ts-test");

    const entry = buf.getEntries()[0];
    expect(entry.ts).toBeGreaterThanOrEqual(before);
    expect(entry.ts).toBeLessThanOrEqual(Date.now());
  });

  it("omits data field when not provided", () => {
    const buf = createBufferTransport();
    const log = createLogger([buf.transport]);

    log.info("no-data");

    const entry = buf.getEntries()[0];
    expect(entry).not.toHaveProperty("data");
  });

  it("does not throw when a transport throws", () => {
    const throwing = () => { throw new Error("boom"); };
    const buf = createBufferTransport();
    const log = createLogger([throwing, buf.transport]);

    // Should not throw and second transport still receives
    expect(() => log.error("after-throw")).not.toThrow();
    expect(buf.getEntries()).toHaveLength(1);
  });
});

describe("createBufferTransport", () => {
  it("returns copies of entries array (immutable)", () => {
    const buf = createBufferTransport();
    const log = createLogger([buf.transport]);

    log.info("a");
    const snapshot = buf.getEntries();
    log.info("b");

    expect(snapshot).toHaveLength(1);
    expect(buf.getEntries()).toHaveLength(2);
  });
});

describe("consoleTransport", () => {
  let originalWrite;
  let originalDebug;
  let originalQuiet;
  let captured;

  beforeEach(() => {
    originalWrite = process.stderr.write;
    originalDebug = process.env.LOOPHAUS_DEBUG;
    originalQuiet = process.env.LOOPHAUS_QUIET;
    captured = "";
    process.stderr.write = (chunk) => {
      captured += chunk;
      return true;
    };
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
    process.env.LOOPHAUS_DEBUG = originalDebug;
    process.env.LOOPHAUS_QUIET = originalQuiet;
    if (originalDebug === undefined) delete process.env.LOOPHAUS_DEBUG;
    if (originalQuiet === undefined) delete process.env.LOOPHAUS_QUIET;
  });

  it("formats output as [loophaus:level] event", () => {
    delete process.env.LOOPHAUS_QUIET;
    delete process.env.LOOPHAUS_DEBUG;

    consoleTransport({ level: "warn", event: "disk-full", ts: Date.now() });

    expect(captured).toContain("[loophaus:warn]");
    expect(captured).toContain("disk-full");
  });

  it("includes key=value pairs from data", () => {
    delete process.env.LOOPHAUS_QUIET;
    delete process.env.LOOPHAUS_DEBUG;

    consoleTransport({ level: "info", event: "start", data: { iter: 3, name: "main" }, ts: Date.now() });

    expect(captured).toContain("iter=3");
    expect(captured).toContain("name=main");
  });

  it("suppresses debug messages by default", () => {
    delete process.env.LOOPHAUS_DEBUG;
    delete process.env.LOOPHAUS_QUIET;

    consoleTransport({ level: "debug", event: "trace", ts: Date.now() });

    expect(captured).toBe("");
  });

  it("shows debug messages when LOOPHAUS_DEBUG=1", () => {
    process.env.LOOPHAUS_DEBUG = "1";
    delete process.env.LOOPHAUS_QUIET;

    consoleTransport({ level: "debug", event: "trace", ts: Date.now() });

    expect(captured).toContain("[loophaus:debug]");
    expect(captured).toContain("trace");
  });

  it("suppresses info/debug when LOOPHAUS_QUIET=1", () => {
    process.env.LOOPHAUS_QUIET = "1";
    delete process.env.LOOPHAUS_DEBUG;

    consoleTransport({ level: "info", event: "normal", ts: Date.now() });
    consoleTransport({ level: "debug", event: "verbose", ts: Date.now() });

    expect(captured).toBe("");
  });

  it("still shows warn/error when LOOPHAUS_QUIET=1", () => {
    process.env.LOOPHAUS_QUIET = "1";

    consoleTransport({ level: "warn", event: "warning", ts: Date.now() });
    consoleTransport({ level: "error", event: "failure", ts: Date.now() });

    expect(captured).toContain("warning");
    expect(captured).toContain("failure");
  });
});
