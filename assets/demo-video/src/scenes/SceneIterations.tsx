import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

const createIteration = (
  baseFrame: number,
  iterNum: number,
  storyId: string,
  storyTitle: string,
  verifyMsg: string
): TerminalLineConfig[] => [
  {
    appearAt: baseFrame,
    segments: [
      { text: `  Loop iteration ${iterNum}/10`, color: COLORS.separator },
      { text: " ─────────────────────────", color: COLORS.separator },
    ],
  },
  {
    appearAt: baseFrame + 10,
    indent: 4,
    segments: [
      { text: `${storyId}`, color: COLORS.highlight, bold: true },
      { text: ` ${storyTitle}`, color: COLORS.text },
    ],
  },
  {
    appearAt: baseFrame + 25,
    indent: 4,
    segments: [
      { text: "Read → Implement → ", color: COLORS.dimText },
      { text: verifyMsg, color: COLORS.text },
      { text: " ✓", color: COLORS.accent, bold: true },
    ],
  },
  {
    appearAt: baseFrame + 40,
    indent: 4,
    segments: [
      { text: "git commit ", color: COLORS.dimText },
      { text: `feat: ${storyId} ${storyTitle}`, color: COLORS.accent },
    ],
  },
  { appearAt: baseFrame + 55, segments: [{ text: "" }] },
];

// Scene 3: Claude implements stories autonomously, stop hook re-injects (10s)
export const SceneIterations: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    {
      appearAt: 0,
      segments: [
        { text: "  Claude", color: COLORS.highlight, bold: true },
        { text: " is implementing stories autonomously...", color: COLORS.dimText },
      ],
    },
    {
      appearAt: 8,
      segments: [
        { text: "  Stop hook re-injects prompt each iteration", color: COLORS.dimText },
      ],
    },
    { appearAt: 15, segments: [{ text: "" }] },
    ...createIteration(20, 1, "US-001", "Add users table", "migration passes"),
    ...createIteration(90, 2, "US-002", "JWT auth middleware", "token validated"),
    ...createIteration(160, 3, "US-003", "Login API endpoint", "POST /login OK"),
    ...createIteration(230, 4, "US-004", "Protected routes", "401 without token"),
  ];

  return <TerminalBlock lines={lines} />;
};
