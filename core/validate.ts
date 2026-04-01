// core/validate.ts — Zero-dep runtime schema validation

const STATE_REQUIRED: Record<string, string> = {
  active: "boolean",
  prompt: "string",
  maxIterations: "number",
  currentIteration: "number",
};

const STATE_OPTIONAL: Record<string, string> = {
  completionPromise: "string",
  sessionId: "string",
  name: "string",
  verifyScript: "string",
  startedAt: "string",
  cost: "object",
  qualityThreshold: "number",
  maxRefineAttempts: "number",
  qualityConfig: "object",
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateState(obj: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, errors: ["State must be an object"] };
  }
  const record = obj as Record<string, unknown>;
  for (const [key, type] of Object.entries(STATE_REQUIRED)) {
    if (!(key in record)) errors.push(`Missing required field: ${key}`);
    else if (typeof record[key] !== type) errors.push(`${key} must be ${type}, got ${typeof record[key]}`);
  }
  for (const [key, type] of Object.entries(STATE_OPTIONAL)) {
    if (key in record && record[key] !== undefined && record[key] !== null && typeof record[key] !== type) {
      errors.push(`${key} must be ${type}, got ${typeof record[key]}`);
    }
  }
  if (typeof record.maxIterations === "number" && record.maxIterations < 0) {
    errors.push("maxIterations must be >= 0");
  }
  if (typeof record.currentIteration === "number" && record.currentIteration < 0) {
    errors.push("currentIteration must be >= 0");
  }
  return { valid: errors.length === 0, errors };
}

export function validateLoopConfig(obj: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, errors: ["Config must be an object"] };
  }
  const record = obj as Record<string, unknown>;
  if (record.protocol_version && record.protocol_version !== "1.0") {
    errors.push(`Unsupported protocol version: ${record.protocol_version}`);
  }
  return { valid: errors.length === 0, errors };
}
