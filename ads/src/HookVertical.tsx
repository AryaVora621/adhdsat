import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { fn, offsetShadow, font } from './theme';
import { Grain } from './components/Grain';
import { SprintCard } from './components/SprintCard';
import { Logo } from './components/Logo';
import { Underline } from './components/Underline';
import './fonts';

const Word: React.FC<{ children: React.ReactNode; delay: number; tilt: number }> = ({
  children,
  delay,
  tilt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.6 } });
  const y = interpolate(s, [0, 1], [50, 0]);
  const o = interpolate(s, [0, 1], [0, 1]);
  return (
    <div
      style={{
        transform: `translateY(${y}px) rotate(${interpolate(s, [0, 1], [tilt * 2, tilt])}deg)`,
        opacity: o,
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: 96,
        color: fn.ink,
        lineHeight: 1.04,
      }}
    >
      {children}
    </div>
  );
};

// Beat 1: the pain.
const Beat1: React.FC = () => {
  const frame = useCurrentFrame();
  const noteOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ padding: '160px 80px', justifyContent: 'center' }}>
      <Word delay={0} tilt={-1.5}>Opening a</Word>
      <Word delay={8} tilt={1}>textbook feels</Word>
      <Word delay={16} tilt={-1}>impossible.</Word>
      <div
        style={{
          fontFamily: font.hand,
          fontWeight: 700,
          fontSize: 64,
          color: fn.terra,
          marginTop: 48,
          transform: 'rotate(-3deg)',
          opacity: noteOpacity,
        }}
      >
        so we made starting tiny.
      </div>
    </AbsoluteFill>
  );
};

// Beat 2: the proof — sprint card with reveal + XP pop.
const Beat2: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <SprintCard revealFrame={48} width={840} />
  </AbsoluteFill>
);

// Beat 3: momentum — streak counter.
const Beat3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const streak = Math.round(interpolate(s, [0, 1], [1, 7]));
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 50 }}>
      <div
        style={{
          fontFamily: font.display,
          fontWeight: 800,
          fontSize: 88,
          color: fn.ink,
          textAlign: 'center',
          lineHeight: 1.1,
          padding: '0 80px',
        }}
      >
        60-second sprints.
        <br />
        Real progress.
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background: fn.card,
          border: `3px solid ${fn.ink}`,
          borderRadius: '20px 24px 18px 22px',
          boxShadow: offsetShadow(8, fn.ink),
          padding: '26px 46px',
          transform: 'rotate(-1.5deg)',
        }}
      >
        <span style={{ fontSize: 80 }}>🔥</span>
        <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 110, color: fn.terra }}>
          {streak}
        </span>
        <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 38, color: fn.inkSoft }}>
          day streak
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Beat 4: CTA.
const Beat4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const drawn = interpolate(frame, [18, 40], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 56 }}>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.8, 1])}) rotate(-2deg)`, opacity: s }}>
        <Logo scale={1.5} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: 64,
            color: fn.terra,
          }}
        >
          Start free — no setup
        </div>
        <Underline progress={drawn} width={440} />
      </div>
      <div style={{ fontFamily: font.body, fontWeight: 600, fontSize: 40, color: fn.inkSoft }}>
        adhdsat.vercel.app
      </div>
    </AbsoluteFill>
  );
};

export const HookVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: fn.paper }}>
      {/* 15s @ 30fps = 450 frames. Beats overlap slightly via Sequence offsets. */}
      <Sequence durationInFrames={120}>
        <Beat1 />
      </Sequence>
      <Sequence from={120} durationInFrames={165}>
        <Beat2 />
      </Sequence>
      <Sequence from={285} durationInFrames={90}>
        <Beat3 />
      </Sequence>
      <Sequence from={375} durationInFrames={75}>
        <Beat4 />
      </Sequence>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
