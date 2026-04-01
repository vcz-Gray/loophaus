import { describe, it, expect } from "vitest";
import { distributeStories } from "../core/parallel-runner.mjs";
import { STRATEGIES } from "../core/merge-strategy.mjs";

describe("distributeStories", () => {
  it("distributes evenly", () => {
    const stories = [
      { id: "US-001", priority: 1 },
      { id: "US-002", priority: 2 },
      { id: "US-003", priority: 3 },
      { id: "US-004", priority: 4 },
    ];
    const buckets = distributeStories(stories, 2);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveLength(2);
    expect(buckets[1]).toHaveLength(2);
    // Priority order: 1,2,3,4 → bucket[0]=[1,3], bucket[1]=[2,4]
    expect(buckets[0][0].id).toBe("US-001");
    expect(buckets[1][0].id).toBe("US-002");
  });

  it("handles more workers than stories", () => {
    const stories = [{ id: "US-001", priority: 1 }];
    const buckets = distributeStories(stories, 3);
    expect(buckets).toHaveLength(3);
    expect(buckets[0]).toHaveLength(1);
    expect(buckets[1]).toHaveLength(0);
    expect(buckets[2]).toHaveLength(0);
  });

  it("handles empty stories", () => {
    const buckets = distributeStories([], 2);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveLength(0);
  });

  it("sorts by priority", () => {
    const stories = [
      { id: "US-003", priority: 3 },
      { id: "US-001", priority: 1 },
      { id: "US-002", priority: 2 },
    ];
    const buckets = distributeStories(stories, 1);
    expect(buckets[0][0].id).toBe("US-001");
    expect(buckets[0][1].id).toBe("US-002");
    expect(buckets[0][2].id).toBe("US-003");
  });
});

describe("STRATEGIES", () => {
  it("defines three strategies", () => {
    expect(Object.keys(STRATEGIES)).toHaveLength(3);
    expect(STRATEGIES.sequential).toBeDefined();
    expect(STRATEGIES.squash).toBeDefined();
    expect(STRATEGIES["cherry-pick"]).toBeDefined();
  });
});
