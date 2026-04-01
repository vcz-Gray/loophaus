// core/validate.mjs — Zero-dep runtime schema validation

const STATE_REQUIRED = {
  active: "boolean",
  prompt: "string",
  maxIterations: "number",
  currentIteration: "number",
};

const STATE_OPTIONAL = {
  completionPromise: "string",
  sessionId: "string",
  name: "string",
  verifyScript: "string",
  startedAt: "string",
  cost: "object",
};

export function validateState(obj) {
  const errors = [];
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, errors: ["State must be an object"] };
  }
  for (const [key, type] of Object.entries(STATE_REQUIRED)) {
    if (!(key in obj)) errors.push(`Missing required field: ${key}`);
    else if (typeof obj[key] !== type) errors.push(`${key} must be ${type}, got ${typeof obj[key]}`);
  }
  for (const [key, type] of Object.entries(STATE_OPTIONAL)) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null && typeof obj[key] !== type) {
      errors.push(`${key} must be ${type}, got ${typeof obj[key]}`);
    }
  }
  if (typeof obj.maxIterations === "number" && obj.maxIterations < 0) {
    errors.push("maxIterations must be >= 0");
  }
  if (typeof obj.currentIteration === "number" && obj.currentIteration < 0) {
    errors.push("currentIteration must be >= 0");
  }
  return { valid: errors.length === 0, errors };
}

export function validateLoopConfig(obj) {
  const errors = [];
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, errors: ["Config must be an object"] };
  }
  if (obj.protocol_version && obj.protocol_version !== "1.0") {
    errors.push(`Unsupported protocol version: ${obj.protocol_version}`);
  }
  return { valid: errors.length === 0, errors };
}
