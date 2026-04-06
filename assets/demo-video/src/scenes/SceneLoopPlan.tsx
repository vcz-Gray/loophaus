import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

// Scene 2: Start loop-plan (frames 0-150 within this scene, ~5s)
export const SceneLoopPlan: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    // > /loop-plan ...
    {
      appearAt: 0,
      typed: true,
      charSpeed: 1,
      segments: [
        { text: "> ", color: COLORS.prompt },
        {
          text: '/loop-plan "Add user authentication with JWT"',
          color: COLORS.command,
        },
      ],
    },
    // blank
    { appearAt: 50, segments: [{ text: "" }] },
    // Generating PRD
    {
      appearAt: 55,
      segments: [
        { text: "Generating PRD...", color: COLORS.highlight, bold: true },
      ],
    },
    // checkmark 1
    {
      appearAt: 75,
      indent: 2,
      segments: [
        { text: "\u2713 ", color: COLORS.accent },
        { text: "4 user stories created", color: COLORS.text },
      ],
    },
    // checkmark 2
    {
      appearAt: 90,
      indent: 2,
      segments: [
        { text: "\u2713 ", color: COLORS.accent },
        { text: "Loop activated ", color: COLORS.text },
        { text: "(max 10 iterations)", color: COLORS.dimText },
      ],
    },
    // blank
    { appearAt: 105, segments: [{ text: "" }] },
    // Starting US-001
    {
      appearAt: 115,
      segments: [
        { text: "Starting ", color: COLORS.text },
        { text: "US-001", color: COLORS.highlight, bold: true },
        { text: ": Add users table...", color: COLORS.text },
      ],
    },
  ];

  return <TerminalBlock lines={lines} />;
};
