import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";

// Terminal window chrome: title bar with traffic lights and body area
export const TerminalChrome: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          width: 736,
          height: 436,
          backgroundColor: COLORS.terminalBg,
          borderRadius: 12,
          border: `1px solid ${COLORS.terminalBorder}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            backgroundColor: "#161b22",
            borderBottom: `1px solid ${COLORS.terminalBorder}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            paddingRight: 14,
            flexShrink: 0,
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: COLORS.trafficRed,
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: COLORS.trafficYellow,
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: COLORS.trafficGreen,
              }}
            />
          </div>
          {/* Title text */}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: FONT_FAMILY,
              fontSize: 12,
              color: COLORS.dimText,
              marginRight: 52, // offset for traffic lights to center text
            }}
          >
            Claude Code — my-project
          </div>
        </div>
        {/* Terminal body */}
        <div
          style={{
            flex: 1,
            padding: 18,
            paddingTop: 14,
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            lineHeight: 1.6,
            color: COLORS.text,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
