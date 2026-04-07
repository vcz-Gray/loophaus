import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

// Scene 1: Setup — show the one-time install, then entering Claude Code (0-150 frames, ~5s)
export const SceneInstall: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    {
      appearAt: 0,
      typed: true,
      charSpeed: 1,
      segments: [
        { text: "$ ", color: COLORS.prompt },
        { text: "npm install -g @graypark/loophaus && loophaus install", color: COLORS.command },
      ],
    },
    {
      appearAt: 50,
      segments: [
        { text: "✔ ", color: COLORS.accent, bold: true },
        { text: "loophaus installed for Claude Code!", color: COLORS.text },
      ],
    },
    { appearAt: 65, segments: [{ text: "" }] },
    {
      appearAt: 70,
      typed: true,
      charSpeed: 2,
      segments: [
        { text: "$ ", color: COLORS.prompt },
        { text: "claude", color: COLORS.command },
      ],
    },
    { appearAt: 95, segments: [{ text: "" }] },
    {
      appearAt: 100,
      segments: [
        { text: "╭─ ", color: COLORS.separator },
        { text: "Claude Code", color: COLORS.highlight, bold: true },
        { text: " ─────────────────────────────────╮", color: COLORS.separator },
      ],
    },
    {
      appearAt: 110,
      segments: [
        { text: "│ ", color: COLORS.separator },
        { text: "loophaus v3.9 active", color: COLORS.dimText },
        { text: "  /loop-plan /loop /loop-pulse", color: COLORS.accent },
        { text: " │", color: COLORS.separator },
      ],
    },
    {
      appearAt: 120,
      segments: [
        { text: "╰──────────────────────────────────────────────╯", color: COLORS.separator },
      ],
    },
  ];

  return <TerminalBlock lines={lines} />;
};
