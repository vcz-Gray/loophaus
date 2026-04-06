import React from "react";
import { TerminalBlock, TerminalLineConfig } from "../components/TerminalLine";
import { COLORS } from "../theme";

// Scene 1: npm install and loophaus install (0-150 frames, ~5s)
export const SceneInstall: React.FC = () => {
  const lines: TerminalLineConfig[] = [
    // $ npm install -g @graypark/loophaus
    {
      appearAt: 0,
      typed: true,
      charSpeed: 1,
      segments: [
        { text: "$ ", color: COLORS.prompt },
        { text: "npm install -g @graypark/loophaus", color: COLORS.command },
      ],
    },
    // output: added 1 package
    {
      appearAt: 40,
      segments: [{ text: "added 1 package in 1.2s", color: COLORS.dimText }],
    },
    // blank line
    {
      appearAt: 50,
      segments: [{ text: "" }],
    },
    // $ loophaus install
    {
      appearAt: 55,
      typed: true,
      charSpeed: 2,
      segments: [
        { text: "$ ", color: COLORS.prompt },
        { text: "loophaus install", color: COLORS.command },
      ],
    },
    // Detected hosts
    {
      appearAt: 90,
      segments: [
        { text: "Detected hosts: ", color: COLORS.text },
        { text: "claude-code", color: COLORS.highlight, bold: true },
      ],
    },
    // blank line
    {
      appearAt: 100,
      segments: [{ text: "" }],
    },
    // checkmark line
    {
      appearAt: 110,
      segments: [
        { text: "\u2714 ", color: COLORS.accent, bold: true },
        { text: "loophaus installed for Claude Code!", color: COLORS.text },
      ],
    },
    // hint
    {
      appearAt: 125,
      indent: 2,
      segments: [
        { text: "Run ", color: COLORS.dimText },
        { text: "/reload-plugins", color: COLORS.highlight },
        { text: " to activate.", color: COLORS.dimText },
      ],
    },
  ];

  return <TerminalBlock lines={lines} />;
};
