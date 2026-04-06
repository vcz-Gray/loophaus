// Visual theme for the loophaus demo video

export const COLORS = {
  bg: "#1a1a2e",
  terminalBg: "#0d1117",
  terminalBorder: "#30363d",
  text: "#e0e0e0",
  dimText: "#8b949e",
  accent: "#00d4aa",
  error: "#ff6b6b",
  highlight: "#ffd93d",
  command: "#79c0ff",
  prompt: "#7ee787",
  trafficRed: "#ff5f57",
  trafficYellow: "#febc2e",
  trafficGreen: "#28c840",
  separator: "#484f58",
} as const;

export const FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', Menlo, Monaco, Consolas, monospace";

export const FONT_SIZE = {
  terminal: 14,
  title: 28,
  tagline: 16,
} as const;

// Timing constants (in frames at 30fps)
export const FPS = 30;

export const SCENE_TIMING = {
  install: { start: 0, duration: 150 },
  loopPlan: { start: 150, duration: 150 },
  iterations: { start: 300, duration: 300 },
  quality: { start: 600, duration: 150 },
  completion: { start: 750, duration: 150 },
} as const;
