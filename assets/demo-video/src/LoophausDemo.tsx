import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { TerminalChrome } from "./components/TerminalChrome";
import { SceneInstall } from "./scenes/SceneInstall";
import { SceneLoopPlan } from "./scenes/SceneLoopPlan";
import { SceneIterations } from "./scenes/SceneIterations";
import { SceneQuality } from "./scenes/SceneQuality";
import { SceneCompletion } from "./scenes/SceneCompletion";
import { SCENE_TIMING } from "./theme";

// Load JetBrains Mono for terminal aesthetic
const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const LoophausDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <TerminalChrome>
        {/* Scene 1: Install (0-150 frames) */}
        <Sequence
          from={SCENE_TIMING.install.start}
          durationInFrames={SCENE_TIMING.install.duration}
          premountFor={Math.round(0.5 * fps)}
        >
          <SceneInstall />
        </Sequence>

        {/* Scene 2: Loop Plan (150-300 frames) */}
        <Sequence
          from={SCENE_TIMING.loopPlan.start}
          durationInFrames={SCENE_TIMING.loopPlan.duration}
          premountFor={Math.round(0.5 * fps)}
        >
          <SceneLoopPlan />
        </Sequence>

        {/* Scene 3: Iterations (300-600 frames) */}
        <Sequence
          from={SCENE_TIMING.iterations.start}
          durationInFrames={SCENE_TIMING.iterations.duration}
          premountFor={Math.round(0.5 * fps)}
        >
          <SceneIterations />
        </Sequence>

        {/* Scene 4: Quality Scoring (600-750 frames) */}
        <Sequence
          from={SCENE_TIMING.quality.start}
          durationInFrames={SCENE_TIMING.quality.duration}
          premountFor={Math.round(0.5 * fps)}
        >
          <SceneQuality />
        </Sequence>

        {/* Scene 5: Completion (750-900 frames) */}
        <Sequence
          from={SCENE_TIMING.completion.start}
          durationInFrames={SCENE_TIMING.completion.duration}
          premountFor={Math.round(0.5 * fps)}
        >
          <SceneCompletion />
        </Sequence>
      </TerminalChrome>
    </AbsoluteFill>
  );
};
