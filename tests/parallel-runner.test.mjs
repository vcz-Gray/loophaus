import { describe, it, expect } from "vitest";
import { distributeStories } from "../core/parallel-runner.js";

describe("distributeStories", () => {
  it("distributes stories round-robin by priority", () => {
    const stories = [
      { id: "US-001", priority: 1 },
      { id: "US-002", priority: 2 },
      { id: "US-003", priority: 3 },
      { id: "US-004", priority: 4 },
    ];
    const buckets = distributeStories(stories, 2);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].map(s => s.id)).toEqual(["US-001", "US-003"]);
    expect(buckets[1].map(s => s.id)).toEqual(["US-002", "US-004"]);
  });

  it("handles more buckets than stories", () => {
    const stories = [{ id: "US-001", priority: 1 }];
    const buckets = distributeStories(stories, 3);
    expect(buckets[0]).toHaveLength(1);
    expect(buckets[1]).toHaveLength(0);
    expect(buckets[2]).toHaveLength(0);
  });

  it("handles empty stories", () => {
    const buckets = distributeStories([], 2);
    expect(buckets).toHaveLength(2);
    expect(buckets.every(b => b.length === 0)).toBe(true);
  });

  it("sorts by priority before distributing", () => {
    const stories = [
      { id: "US-003", priority: 3 },
      { id: "US-001", priority: 1 },
      { id: "US-002", priority: 2 },
    ];
    const buckets = distributeStories(stories, 2);
    expect(buckets[0][0].id).toBe("US-001");
    expect(buckets[1][0].id).toBe("US-002");
  });

  it("uses priority 999 as default for missing priority", () => {
    const stories = [
      { id: "US-001" },
      { id: "US-002", priority: 1 },
    ];
    const buckets = distributeStories(stories, 2);
    expect(buckets[0][0].id).toBe("US-002");
    expect(buckets[1][0].id).toBe("US-001");
  });
});
