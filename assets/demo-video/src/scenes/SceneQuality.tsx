import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";

type ScoreRow = {
  id: string;
  score: number;
  grade: string;
  appearAt: number;
};

const scores: ScoreRow[] = [
  { id: "US-001", score: 92, grade: "A", appearAt: 30 },
  { id: "US-002", score: 88, grade: "B+", appearAt: 50 },
  { id: "US-003", score: 95, grade: "A+", appearAt: 70 },
  { id: "US-004", score: 90, grade: "A", appearAt: 90 },
];

const getGradeColor = (grade: string): string => {
  if (grade.startsWith("A")) return COLORS.accent;
  if (grade.startsWith("B")) return COLORS.highlight;
  return COLORS.text;
};

// Scene 4: Quality scoring (frames 0-150 within this scene, ~5s)
export const SceneQuality: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title appearance
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Overall score
  const overallAppearAt = 110;
  const overallOpacity = interpolate(
    frame,
    [overallAppearAt, overallAppearAt + 10],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const overallScale = spring({
    frame: Math.max(0, frame - overallAppearAt),
    fps,
    config: { damping: 200 },
  });

  return (
    <div>
      {/* Title */}
      <div style={{ opacity: titleOpacity }}>
        <div
          style={{
            color: COLORS.highlight,
            fontWeight: "bold",
            fontSize: 15,
            marginBottom: 2,
          }}
        >
          Quality Evaluation
        </div>
        <div style={{ color: COLORS.separator, marginBottom: 8 }}>
          {"\u2550".repeat(40)}
        </div>
      </div>

      {/* Score rows */}
      {scores.map((row) => {
        const localFrame = frame - row.appearAt;
        if (localFrame < 0) return null;

        const rowOpacity = interpolate(localFrame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });

        const slideX = interpolate(localFrame, [0, 8], [20, 0], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });

        return (
          <div
            key={row.id}
            style={{
              opacity: rowOpacity,
              transform: `translateX(${slideX}px)`,
              display: "flex",
              gap: 12,
              whiteSpace: "pre",
              marginBottom: 2,
            }}
          >
            <span style={{ color: COLORS.dimText, width: 60 }}>
              {"  "}
              {row.id}
            </span>
            <span style={{ color: COLORS.text }}>
              score: {row.score}
            </span>
            <span
              style={{
                color: getGradeColor(row.grade),
                fontWeight: "bold",
              }}
            >
              ({row.grade})
            </span>
            <span style={{ color: COLORS.accent, fontWeight: "bold" }}>
              {"\u2713"}
            </span>
          </div>
        );
      })}

      {/* Overall score */}
      <div
        style={{
          opacity: overallOpacity,
          transform: `scale(${overallScale})`,
          transformOrigin: "left center",
          marginTop: 16,
          whiteSpace: "pre",
        }}
      >
        <div style={{ color: COLORS.separator, marginBottom: 6 }}>
          {"\u2500".repeat(40)}
        </div>
        <span style={{ color: COLORS.text }}>Overall: </span>
        <span style={{ color: COLORS.accent, fontWeight: "bold", fontSize: 16 }}>
          91/100
        </span>
        <span style={{ color: COLORS.text }}> {"\u2014"} </span>
        <span
          style={{ color: COLORS.accent, fontWeight: "bold", fontSize: 16 }}
        >
          PASS
        </span>
      </div>
    </div>
  );
};
