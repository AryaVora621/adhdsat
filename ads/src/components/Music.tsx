import React from 'react';
import { Audio, staticFile, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Music bed with gentle fade in/out, ducked so on-screen text stays dominant.
// DISABLED by default: enable per-composition by passing a track filename that
// exists in ads/public/audio/. Renders work with or without a track.
//
// Drop a licensed/royalty-free track at ads/public/audio/<file> and pass its name.
// See ads/MUSIC.md for sourcing + the brief.
export const Music: React.FC<{ track?: string; volume?: number; fadeFrames?: number }> = ({
  track,
  volume = 0.32,
  fadeFrames = 24,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!track) return null;

  const v = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <Audio src={staticFile(`audio/${track}`)} volume={v} />;
};
