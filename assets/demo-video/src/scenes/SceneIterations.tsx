import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

// Helper to create iteration block lines
const createIteration = (
  baseFrame: number,
  iterNum: number,
  storyId: string,
  storyTitle: string,
  verifyMsg: string
): TerminalLineConfig[] => [
  // Header: Iteration N/10
  {
    appearAt: baseFrame,
    segments: [
      { text: `Iteration ${iterNum}/10`, color: COLORS.highlight, bold: true },
    ],
  },
  // Arrow: US-XXX story
  {
    appearAt: baseFrame + 12,
    indent: 2,
    segments: [
      { text: "\u2192 ", color: COLORS.dimText },
      { text: `${storyId}: `, color: COLORS.accent, bold: true },
      { text: storyTitle, color: COLORS.text },
    ],
  },
  // Arrow: Verified
  {
    appearAt: baseFrame + 30,
    indent: 2,
    segments: [
      { text: "\u2192 Verified: ", color: COLORS.dimText },
      { text: verifyMsg, color: COLORS.text },
      { text: " \u2713", color: COLORS.accent, bold: true },
    ],
  },
  // Arrow: Committed
  {
    appearAt: baseFrame + 45,
    indent: 2,
    segments: [
      { text: "\u2192 Committed: ", color: COLORS.dimText },
      {
        text: `feat: ${storyId}`,
        color: COLORS.accent,
      },
    ],
  },
  // blank
  { appearAt: baseFrame + 58, segments: [{ text: "" }] },
];

// Scene 3: Loop iterations (frames 0-300 within this scene, ~10s)
export const SceneIterations: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    ...createIteration(0, 1, "US-001", "Add users table", "migration runs"),
    ...createIteration(
      75,
      2,
      "US-002",
      "Add JWT auth middleware",
      "token validation"
    ),
    ...createIteration(
      150,
      3,
      "US-003",
      "Add login API endpoint",
      "POST /login returns token"
    ),
    ...createIteration(
      225,
      4,
      "US-004",
      "Add protected routes",
      "401 without token"
    ),
  ];

  return <TerminalBlock lines={lines} />;
};
