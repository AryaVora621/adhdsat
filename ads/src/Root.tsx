import React from 'react';
import { Composition } from 'remotion';
import { HookVertical } from './HookVertical';
import { Explainer } from './Explainer';
import { Bumper } from './Bumper';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HookVertical"
        component={HookVertical}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Bumper"
        component={Bumper}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
