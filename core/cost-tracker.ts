// core/cost-tracker.ts — Token cost estimation. Prices in USD per 1M tokens.

interface ModelPrice {
  input: number;
  output: number;
}

interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

interface CostRecord extends CostBreakdown {
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ts: string;
}

interface TrackerSummary {
  totalInput: number;
  totalOutput: number;
  totalCost: number;
  records: number;
}

export interface CostTracker {
  record(label: string, model: string, inputTokens: number, outputTokens: number): CostBreakdown;
  summary(): TrackerSummary;
  getRecords(): CostRecord[];
}

const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-4": { input: 0.8, output: 4 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "default": { input: 3, output: 15 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): CostBreakdown {
  const prices = MODEL_PRICES[model] || MODEL_PRICES["default"];
  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${(cost * 100).toFixed(2)}¢`;
  return `$${cost.toFixed(4)}`;
}

export function createTracker(): CostTracker {
  const records: CostRecord[] = [];
  return {
    record(label: string, model: string, inputTokens: number, outputTokens: number): CostBreakdown {
      const cost = estimateCost(model, inputTokens, outputTokens);
      records.push({ label, model, inputTokens, outputTokens, ...cost, ts: new Date().toISOString() });
      return cost;
    },
    summary(): TrackerSummary {
      const totalInput = records.reduce((s, r) => s + r.inputTokens, 0);
      const totalOutput = records.reduce((s, r) => s + r.outputTokens, 0);
      const totalCost = records.reduce((s, r) => s + r.totalCost, 0);
      return { totalInput, totalOutput, totalCost, records: records.length };
    },
    getRecords(): CostRecord[] { return [...records]; },
  };
}

export { MODEL_PRICES };
