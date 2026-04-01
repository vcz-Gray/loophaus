export interface LoopState {
  active: boolean;
  prompt: string;
  completionPromise: string;
  maxIterations: number;
  currentIteration: number;
  sessionId: string;
  verifyScript: string;
  name?: string;
  startedAt?: string;
  qualityThreshold?: number;
  maxRefineAttempts?: number;
  qualityConfig?: QualityConfig | null;
}

export interface StopHookInput {
  last_assistant_text: string;
  stop_hook_active: boolean;
  has_pending_stories: boolean;
  session_id: string;
  transcript_path?: string;
  policy_result?: PolicyResult;
  verify_result?: VerifyResult;
  test_results?: TestResult[];
}

export interface StopHookResult {
  decision: "allow" | "block";
  nextState: LoopState;
  events: LoopEvent[];
  output: StopHookOutput | null;
  message?: string;
}

export interface StopHookOutput {
  decision: "block";
  reason: string;
  systemMessage?: string;
}

export interface LoopEvent {
  event: string;
  [key: string]: unknown;
}

export interface PolicyResult {
  shouldStop: boolean;
  violations: PolicyViolation[];
}

export interface PolicyViolation {
  type: string;
  current: number;
  limit: number;
}

export interface VerifyResult {
  passed: boolean;
  output?: string;
}

export interface TestResult {
  storyId: string;
  passed: boolean;
}

export interface QualityScore {
  story: string;
  tests: number;
  typecheck: number;
  lint: number;
  verify: number;
  diff: number;
  custom: number;
  total: number;
  grade: string;
}

export interface QualityConfig {
  weights?: Partial<Record<"tests" | "typecheck" | "lint" | "verify" | "diff" | "custom", number>>;
}

export interface RefineResult {
  keep: boolean;
  reason: string;
}

export interface MergeResult {
  branch: string;
  status: string;
  error?: string;
  commits?: number;
}

export interface WorktreeInfo {
  name: string;
  path: string;
  branch: string;
  head?: string;
}

export interface TraceEvent {
  ts: string;
  event: string;
  [key: string]: unknown;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  model: string;
}
