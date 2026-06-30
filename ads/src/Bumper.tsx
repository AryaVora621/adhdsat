import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { fn, font } from './theme';
import { Grain } from './components/Grain';
import { SprintCard } from './components/SprintCard';
import { Logo } from './components/Logo';
import { Underline } from './components/Underline';
import './fonts';

// Beat 1: one memorable line.
const Beat1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          transform: `translateY(${y}px) rotate(-1.5deg)`,
          opacity: s,
          fontFamily: font.display,
          fontWeight: 800,
          fontSize: 110,
          color: fn.ink,
          textAlign: 'center',
          lineHeight: 1.05,
          padding: '0 120px',
        }}
      >
        Studying, in
        <br />
        60-second wins.
      </div>
    </AbsoluteFill>
  );
};

// Beat 2: sprint card flash.
const Beat2: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <SprintCard revealFrame={18} width={760} />
  </AbsoluteFill>
);

// Beat 3: logo CTA.
const Beat3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const drawn = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 40 }}>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.85, 1])}) rotate(-2deg)`, opacity: s }}>
        <Logo scale={1.6} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 56, color: fn.terra }}>
          Start free
        </div>
        <Underline progress={drawn} width={300} />
      </div>
    </AbsoluteFill>
  );
};

export const Bumper: React.FC = () => {
  // 6s @ 30fps = 180 frames.
  return (
    <AbsoluteFill style={{ background: fn.paper }}>
      <Sequence durationInFrames={75}>
        <Beat1 />
      </Sequence>
      <Sequence from={75} durationInFrames={60}>
        <Beat2 />
      </Sequence>
      <Sequence from={135} durationInFrames={45}>
        <Beat3 />
      </Sequence>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
