import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { PolicyResult, PolicyViolation } from "./types.js";

interface PolicyCondition {
  type: string;
  value: number;
}

interface Policy {
  id: string;
  conditions: PolicyCondition[];
}

interface PolicyContext {
  totalCost?: number;
  errorCount?: number;
}

interface PolicyState {
  currentIteration: number;
  startedAt?: string;
}

const DEFAULT_POLICY: Policy = {
  id: "default",
  conditions: [
    { type: "max_iterations", value: 20 },
  ],
};

export async function loadPolicy(cwd?: string): Promise<Policy> {
  const policyPath = join(cwd || process.cwd(), ".loophaus", "policy.json");
  try {
    const raw = await readFile(policyPath, "utf-8");
    return JSON.parse(raw) as Policy;
  } catch {
    return DEFAULT_POLICY;
  }
}

export function evaluatePolicy(policy: Policy, state: PolicyState, context: PolicyContext = {}): PolicyResult {
  const violations: PolicyViolation[] = [];

  for (const condition of policy.conditions || []) {
    switch (condition.type) {
      case "max_iterations":
        if (state.currentIteration > condition.value) {
          violations.push({ type: "max_iterations", limit: condition.value, current: state.currentIteration });
        }
        break;
      case "max_cost":
        if (context.totalCost && context.totalCost > condition.value) {
          violations.push({ type: "max_cost", limit: condition.value, current: context.totalCost });
        }
        break;
      case "max_time_minutes":
        if (state.startedAt) {
          const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 60000;
          if (elapsed > condition.value) {
            violations.push({ type: "max_time_minutes", limit: condition.value, current: Math.round(elapsed) });
          }
        }
        break;
      case "max_errors":
        if (context.errorCount && context.errorCount > condition.value) {
          violations.push({ type: "max_errors", limit: condition.value, current: context.errorCount });
        }
        break;
    }
  }

  return {
    shouldStop: violations.length > 0,
    violations,
  };
}

export { DEFAULT_POLICY };
