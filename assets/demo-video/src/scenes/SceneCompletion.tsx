import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS } from "../theme";

type CompletionRow = {
  label: string;
  value: string;
  valueColor: string;
  appearAt: number;
};

const rows: CompletionRow[] = [
  {
    label: "Stories:",
    value: "4/4 done",
    valueColor: COLORS.accent,
    appearAt: 25,
  },
  {
    label: "Iterations:",
    value: "5 total",
    valueColor: COLORS.text,
    appearAt: 40,
  },
  {
    label: "Branch:",
    value: "feature/auth-system",
    valueColor: COLORS.command,
    appearAt: 55,
  },
];

// Scene 5: Completion summary + tagline (frames 0-150 within this scene, ~5s)
export const SceneCompletion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // "All stories verified" line
  const verifiedAt = 75;
  const verifiedOpacity = interpolate(
    frame,
    [verifiedAt, verifiedAt + 10],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Tagline area
  const taglineAt = 100;
  const taglineOpacity = interpolate(
    frame,
    [taglineAt, taglineAt + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const taglineY = interpolate(frame, [taglineAt, taglineAt + 15], [10, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div>
      {/* Title */}
      <div style={{ opacity: titleOpacity }}>
        <div
          style={{
            color: COLORS.accent,
            fontWeight: "bold",
            fontSize: 15,
            marginBottom: 2,
          }}
        >
          Loop Complete
        </div>
        <div style={{ color: COLORS.separator, marginBottom: 8 }}>
          {"\u2550".repeat(40)}
        </div>
      </div>

      {/* Completion rows */}
      {rows.map((row) => {
        const localFrame = frame - row.appearAt;
        if (localFrame < 0) return null;

        const rowOpacity = interpolate(localFrame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });

        return (
          <div
            key={row.label}
            style={{
              opacity: rowOpacity,
              whiteSpace: "pre",
              marginBottom: 2,
            }}
          >
            <span style={{ color: COLORS.dimText, display: "inline-block", width: 120 }}>
              {"  "}
              {row.label}
            </span>
            <span style={{ color: row.valueColor, fontWeight: "bold" }}>
              {row.value}
            </span>
          </div>
        );
      })}

      {/* All stories verified */}
      <div
        style={{
          opacity: verifiedOpacity,
          marginTop: 12,
          whiteSpace: "pre",
        }}
      >
        <span style={{ color: COLORS.text }}>All stories verified. </span>
        <span style={{ color: COLORS.accent, fontWeight: "bold" }}>
          {"\u2713"}
        </span>
      </div>

      {/* Tagline / branding */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 24,
          textAlign: "center",
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.separator}`,
        }}
      >
        <div
          style={{
            color: COLORS.accent,
            fontWeight: "bold",
            fontSize: 18,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          loophaus
        </div>
        <div style={{ color: COLORS.dimText, fontSize: 12, marginBottom: 8 }}>
          autonomous dev loops for AI coding agents
        </div>
        <div style={{ color: COLORS.highlight, fontSize: 13 }}>
          npm install -g @graypark/loophaus
        </div>
      </div>
    </div>
  );
};
