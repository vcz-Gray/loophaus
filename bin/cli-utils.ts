// cli-utils.ts — shared CLI utilities and context type

export interface CliContext {
  args: string[];
  command: string;
  dryRun: boolean;
  force: boolean;
  local: boolean;
  verbose: boolean;
  getFlag: (flag: string) => string | undefined;
  getNumericFlag: (flag: string, defaultVal: number) => number;
  projectRoot: string;
}

export function validateFlags(args: string[], knownFlags: Set<string>): void {
  for (const arg of args) {
    if (arg.startsWith("--") && !knownFlags.has(arg)) {
      console.error(`Unknown flag: ${arg}. Run loophaus --help for usage.`);
      process.exit(1);
    }
  }
}

export function suggestCommand(input: string, validCommands: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const cmd of validCommands) {
    const dist = levenshtein(input, cmd);
    if (dist < bestScore && dist <= 3) {
      bestScore = dist;
      best = cmd;
    }
  }
  return best;
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function spinner(label: string): { stop: () => void } {
  const frames = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
  let i = 0;
  const id = setInterval(() => {
    process.stderr.write(`\r${frames[i++ % frames.length]} ${label}`);
  }, 80);
  return {
    stop() {
      clearInterval(id);
      process.stderr.write(`\r\x1b[K`);
    },
  };
}

export function getHost(args: string[]): string | null {
  if (args.includes("--claude")) return "claude-code";
  if (args.includes("--kiro")) return "kiro-cli";
  const idx = args.indexOf("--host");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

export function makeGetFlag(args: string[]): (flag: string) => string | undefined {
  return (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-")) return args[idx + 1];
    return undefined;
  };
}

export function makeGetNumericFlag(args: string[]): (flag: string, defaultVal: number) => number {
  const getFlag = makeGetFlag(args);
  return (flag: string, defaultVal: number): number => {
    const raw = getFlag(flag);
    if (raw === undefined) return defaultVal;
    const num = parseFloat(raw);
    if (isNaN(num)) {
      console.error(`Flag ${flag} requires a numeric value, got: "${raw}"`);
      process.exit(1);
    }
    return num;
  };
}
