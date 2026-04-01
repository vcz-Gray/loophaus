// Pure functions for trace analysis

import { EventType, filterByType, summarizeEvents } from "./events.mjs";

export function analyzeTrace(events) {
  const summary = summarizeEvents(events);
  const iterations = filterByType(events, EventType.ITERATION);
  const stops = filterByType(events, EventType.STOP);
  const errors = filterByType(events, EventType.ERROR);
  const stories = filterByType(events, EventType.STORY_COMPLETE);
  const costs = filterByType(events, EventType.COST);

  const totalCost = costs.reduce((s, e) => s + (e.totalCost || 0), 0);
  const lastStop = stops[stops.length - 1];

  return {
    ...summary,
    iterations: iterations.length,
    stops: stops.length,
    errors: errors.length,
    storiesCompleted: stories.length,
    totalCost,
    lastStopReason: lastStop?.reason || null,
    avgIterationMs: iterations.length > 1 ? summary.durationMs / iterations.length : 0,
  };
}

export function compareTraces(trace1, trace2) {
  const a1 = analyzeTrace(trace1);
  const a2 = analyzeTrace(trace2);

  return {
    trace1: a1,
    trace2: a2,
    diff: {
      iterations: a2.iterations - a1.iterations,
      totalCost: a2.totalCost - a1.totalCost,
      durationMs: a2.durationMs - a1.durationMs,
      storiesCompleted: a2.storiesCompleted - a1.storiesCompleted,
    },
  };
}

export function replayTrace(events, speed = 1) {
  if (events.length === 0) return [];
  const firstTs = new Date(events[0].ts).getTime();
  return events.map(e => ({
    ...e,
    relativeMs: Math.round((new Date(e.ts).getTime() - firstTs) / speed),
  }));
}
