import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

// Scene 2: User runs /loop-plan inside Claude Code session (5s)
export const SceneLoopPlan: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    {
      appearAt: 0,
      typed: true,
      charSpeed: 1,
      segments: [
        { text: "> ", color: COLORS.prompt },
        { text: "/loop-plan ", color: COLORS.accent },
        { text: "Add user authentication with JWT", color: COLORS.text },
      ],
    },
    { appearAt: 45, segments: [{ text: "" }] },
    {
      appearAt: 50,
      segments: [
        { text: "Claude", color: COLORS.highlight, bold: true },
        { text: " is planning...", color: COLORS.dimText },
      ],
    },
    { appearAt: 65, segments: [{ text: "" }] },
    {
      appearAt: 70,
      segments: [
        { text: "  ✓ ", color: COLORS.accent },
        { text: "PRD generated: ", color: COLORS.text },
        { text: "prd.json", color: COLORS.command },
        { text: " (4 stories)", color: COLORS.dimText },
      ],
    },
    {
      appearAt: 85,
      segments: [
        { text: "  ✓ ", color: COLORS.accent },
        { text: "Stop hook activated", color: COLORS.text },
        { text: " — loop will auto-continue", color: COLORS.dimText },
      ],
    },
    {
      appearAt: 100,
      segments: [
        { text: "  ✓ ", color: COLORS.accent },
        { text: "Quality threshold: ", color: COLORS.text },
        { text: "80/100", color: COLORS.highlight, bold: true },
      ],
    },
    { appearAt: 115, segments: [{ text: "" }] },
    {
      appearAt: 120,
      segments: [
        { text: "  Starting ", color: COLORS.text },
        { text: "US-001", color: COLORS.highlight, bold: true },
        { text: ": Add users table with password hash", color: COLORS.text },
      ],
    },
  ];

  return <TerminalBlock lines={lines} />;
};
