import React from "react";
import { Composition } from "remotion";
import { LoophausDemo } from "./LoophausDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LoophausDemo"
      component={LoophausDemo}
      durationInFrames={900}
      fps={30}
      width={800}
      height={500}
    />
  );
};
