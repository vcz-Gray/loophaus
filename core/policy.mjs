import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_POLICY = {
  id: "default",
  conditions: [
    { type: "max_iterations", value: 20 },
  ],
};

export async function loadPolicy(cwd) {
  const policyPath = join(cwd || process.cwd(), ".loophaus", "policy.json");
  try {
    const raw = await readFile(policyPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_POLICY;
  }
}

export function evaluatePolicy(policy, state, context = {}) {
  const violations = [];

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
