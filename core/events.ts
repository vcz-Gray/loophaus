// Event type constants and filter utilities

import type { LoopEvent } from "./types.js";

export const EventType = {
  ITERATION: "iteration",
  STOP: "stop",
  CONTINUE: "continue",
  DECISION: "decision",
  STORY_COMPLETE: "story_complete",
  TEST_RESULT: "test_result",
  COST: "cost",
  VERIFY_SCRIPT: "verify_script",
  VERIFY_FAILED: "verify_failed",
  LOOP_START: "loop_start",
  LOOP_END: "loop_end",
  CHECKPOINT: "checkpoint",
  ERROR: "error",
  STATE_CHANGE: "state_change",
  QUALITY_SCORE: "quality_score",
  REFINE_ATTEMPT: "refine_attempt",
  REFINE_KEEP: "refine_keep",
  REFINE_DISCARD: "refine_discard",
} as const;

export type EventTypeName = typeof EventType[keyof typeof EventType];

export function filterByType(events: LoopEvent[], type: string): LoopEvent[] {
  return events.filter(e => e.event === type);
}

export function filterByTimeRange(events: LoopEvent[], start: Date, end: Date): LoopEvent[] {
  return events.filter(e => {
    const ts = new Date(e.ts as string).getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  });
}

export function filterByLoopId(events: LoopEvent[], loopId: string): LoopEvent[] {
  return events.filter(e => e.loop_id === loopId);
}

export interface EventSummary {
  counts: Record<string, number>;
  total: number;
  durationMs: number;
  firstTs: string | undefined;
  lastTs: string | undefined;
}

export function summarizeEvents(events: LoopEvent[]): EventSummary {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] || 0) + 1;
  }
  const first = events[0];
  const last = events[events.length - 1];
  const durationMs = first && last ? new Date(last.ts as string).getTime() - new Date(first.ts as string).getTime() : 0;
  return { counts, total: events.length, durationMs, firstTs: first?.ts as string | undefined, lastTs: last?.ts as string | undefined };
}
