import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { TerminalChrome } from "./components/TerminalChrome";
import { SceneInstall } from "./scenes/SceneInstall";
import { SceneLoopPlan } from "./scenes/SceneLoopPlan";
import { SceneIterations } from "./scenes/SceneIterations";
import { SceneQuality } from "./scenes/SceneQuality";
import { SceneCompletion } from "./scenes/SceneCompletion";
import { COLORS, SCENE_TIMING } from "./theme";

// Load JetBrains Mono for terminal aesthetic
const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const LoophausDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  const sceneStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.terminalBg,
  };

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <TerminalChrome>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <Sequence
            from={SCENE_TIMING.install.start}
            durationInFrames={SCENE_TIMING.install.duration}
          >
            <div style={sceneStyle}><SceneInstall /></div>
          </Sequence>

          <Sequence
            from={SCENE_TIMING.loopPlan.start}
            durationInFrames={SCENE_TIMING.loopPlan.duration}
          >
            <div style={sceneStyle}><SceneLoopPlan /></div>
          </Sequence>

          <Sequence
            from={SCENE_TIMING.iterations.start}
            durationInFrames={SCENE_TIMING.iterations.duration}
          >
            <div style={sceneStyle}><SceneIterations /></div>
          </Sequence>

          <Sequence
            from={SCENE_TIMING.quality.start}
            durationInFrames={SCENE_TIMING.quality.duration}
          >
            <div style={sceneStyle}><SceneQuality /></div>
          </Sequence>

          <Sequence
            from={SCENE_TIMING.completion.start}
            durationInFrames={SCENE_TIMING.completion.duration}
          >
            <div style={sceneStyle}><SceneCompletion /></div>
          </Sequence>
        </div>
      </TerminalChrome>
    </AbsoluteFill>
  );
};
