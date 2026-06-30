import React from 'react';
import { Composition } from 'remotion';
import { HookVertical } from './HookVertical';

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
      {/* Explainer (30s, 1920x1080) and Bumper (6s) compositions land here next. */}
    </>
  );
};
