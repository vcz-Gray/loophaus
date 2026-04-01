// Event type constants and filter utilities

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
};

export function filterByType(events, type) {
  return events.filter(e => e.event === type);
}

export function filterByTimeRange(events, start, end) {
  return events.filter(e => {
    const ts = new Date(e.ts).getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  });
}

export function filterByLoopId(events, loopId) {
  return events.filter(e => e.loop_id === loopId);
}

export function summarizeEvents(events) {
  const counts = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] || 0) + 1;
  }
  const first = events[0];
  const last = events[events.length - 1];
  const durationMs = first && last ? new Date(last.ts).getTime() - new Date(first.ts).getTime() : 0;
  return { counts, total: events.length, durationMs, firstTs: first?.ts, lastTs: last?.ts };
}
