import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

// Represents a single line that can be typed out or appear instantly
type LineSegment = {
  text: string;
  color?: string;
  bold?: boolean;
};

export type TerminalLineConfig = {
  segments: LineSegment[];
  // Frame at which this line starts appearing (relative to scene start)
  appearAt: number;
  // If true, text is typed character by character; otherwise it appears instantly
  typed?: boolean;
  // Frames per character for typed lines (default: 1)
  charSpeed?: number;
  // Indent level (number of spaces)
  indent?: number;
};

// Blinking cursor component
const Cursor: React.FC<{ visible: boolean; frame: number }> = ({
  visible,
  frame,
}) => {
  if (!visible) return null;

  const blinkFrames = 16;
  const opacity = interpolate(
    frame % blinkFrames,
    [0, blinkFrames / 2, blinkFrames],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span style={{ opacity, color: COLORS.accent, fontWeight: "bold" }}>
      {"\u2588"}
    </span>
  );
};

// Renders a single terminal line with optional typing animation
export const TerminalLine: React.FC<{
  config: TerminalLineConfig;
  showCursor?: boolean;
  isLastVisibleLine?: boolean;
}> = ({ config, showCursor = false, isLastVisibleLine = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - config.appearAt;
  if (localFrame < 0) return null;

  const { segments, typed = false, charSpeed = 1, indent = 0 } = config;

  // Combine all text to determine total length
  const fullText = segments.map((s) => s.text).join("");
  const indentStr = " ".repeat(indent);

  let displayLength: number;
  if (typed) {
    displayLength = Math.min(
      fullText.length,
      Math.floor(localFrame / charSpeed)
    );
  } else {
    displayLength = fullText.length;
  }

  // Render segments up to displayLength
  let charsRemaining = displayLength;
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < segments.length && charsRemaining > 0; i++) {
    const seg = segments[i];
    const segText = seg.text.slice(0, charsRemaining);
    charsRemaining -= segText.length;

    rendered.push(
      <span
        key={i}
        style={{
          color: seg.color || COLORS.text,
          fontWeight: seg.bold ? "bold" : "normal",
        }}
      >
        {segText}
      </span>
    );
  }

  const isTypingComplete = displayLength >= fullText.length;
  const cursorVisible =
    showCursor && isLastVisibleLine && (!typed || !isTypingComplete);

  return (
    <div
      style={{
        whiteSpace: "pre",
        minHeight: "1.6em",
      }}
    >
      {indentStr}
      {rendered}
      <Cursor visible={cursorVisible} frame={frame} />
    </div>
  );
};

// Renders a block of terminal lines with staggered appearance
export const TerminalBlock: React.FC<{
  lines: TerminalLineConfig[];
  showCursor?: boolean;
}> = ({ lines, showCursor = true }) => {
  const frame = useCurrentFrame();

  // Find the last line that has appeared
  let lastVisibleIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (frame >= lines[i].appearAt) {
      lastVisibleIndex = i;
      break;
    }
  }

  return (
    <div>
      {lines.map((line, i) => (
        <TerminalLine
          key={i}
          config={line}
          showCursor={showCursor}
          isLastVisibleLine={i === lastVisibleIndex}
        />
      ))}
    </div>
  );
};
