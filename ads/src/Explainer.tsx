import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { fn, offsetShadow, orgRadius, font } from './theme';
import { Grain } from './components/Grain';
import { SprintCard } from './components/SprintCard';
import { Logo } from './components/Logo';
import { Underline } from './components/Underline';
import { BRAND } from './brand';
import './fonts';

// Shared: a left-side beat heading that staggers in.
const BeatHeading: React.FC<{ kicker: string; title: React.ReactNode; sub?: string }> = ({
  kicker,
  title,
  sub,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <div style={{ transform: `translateY(${y}px)`, opacity: s, maxWidth: 760 }}>
      <div
        style={{
          fontFamily: font.body,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 2,
          color: fn.terra,
          marginBottom: 20,
        }}
      >
        {kicker}
      </div>
      <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 76, color: fn.ink, lineHeight: 1.05 }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontFamily: font.body, fontWeight: 400, fontSize: 34, color: fn.inkSoft, marginTop: 24, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

// Beat 1: hook.
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13 } });
  const drawn = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 140px' }}>
      <div style={{ opacity: s, textAlign: 'center' }}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 104, color: fn.ink, lineHeight: 1.08 }}>
          SAT prep that works
          <br />
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ color: fn.terra }}>with</span>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: -18 }}>
              <Underline progress={drawn} width={220} />
            </div>
          </span>{' '}
          your brain.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Beat 2: sprints (text left, card right).
const Sprints: React.FC = () => (
  <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 120px', gap: 80 }}>
    <div style={{ flex: 1 }}>
      <BeatHeading
        kicker="⚡ SHORT SPRINTS"
        title={<>One question at a time.</>}
        sub="Instant feedback. Points for every win. The friction-free way to actually start."
      />
    </div>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
      <SprintCard revealFrame={50} width={680} />
    </div>
  </AbsoluteFill>
);

// A small review card with a "due" badge for the spaced-repetition beat.
const ReviewCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15 } });
  const pulse = 1 + 0.05 * Math.sin((frame / fps) * 6);
  return (
    <div
      style={{
        position: 'relative',
        width: 620,
        transform: `translateY(${interpolate(enter, [0, 1], [50, 0])}px) rotate(1.2deg)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          background: fn.card,
          border: `3px solid ${fn.ink}`,
          borderRadius: orgRadius,
          boxShadow: offsetShadow(10, fn.ink),
          padding: '40px 44px',
        }}
      >
        <div style={{ fontFamily: font.body, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: fn.teal, marginBottom: 18 }}>
          ↻ REVIEW QUEUE
        </div>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 40, color: fn.ink, lineHeight: 1.15 }}>
          The one you missed, back exactly when you'd forget it.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: -26,
          right: -22,
          background: fn.terra,
          color: fn.card,
          fontFamily: font.body,
          fontWeight: 700,
          fontSize: 26,
          padding: '10px 22px',
          borderRadius: 999,
          border: `3px solid ${fn.ink}`,
          boxShadow: offsetShadow(5, fn.ink),
          transform: `scale(${pulse}) rotate(-4deg)`,
        }}
      >
        3 due
      </div>
    </div>
  );
};

const SpacedRep: React.FC = () => (
  <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 120px', gap: 80 }}>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
      <ReviewCard />
    </div>
    <div style={{ flex: 1 }}>
      <BeatHeading
        kicker="↻ SPACED REPETITION"
        title={<>Miss one? It comes back.</>}
        sub="Wrong answers return right when they matter most, so they actually stick."
      />
    </div>
  </AbsoluteFill>
);

// Beat 4: momentum — counting stats.
const CountStat: React.FC<{ from: number; to: number; label: string; color: string; suffix?: string }> = ({
  from,
  to,
  label,
  color,
  suffix = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const val = Math.round(interpolate(s, [0, 1], [from, to]));
  return (
    <div
      style={{
        background: fn.card,
        border: `3px solid ${fn.ink}`,
        borderRadius: '18px 22px 16px 20px',
        boxShadow: offsetShadow(7, fn.ink),
        padding: '30px 40px',
        textAlign: 'center',
        transform: 'rotate(-1deg)',
        minWidth: 240,
      }}
    >
      <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 86, color, lineHeight: 1 }}>
        {val}
        {suffix}
      </div>
      <div style={{ fontFamily: font.body, fontWeight: 600, fontSize: 28, color: fn.inkSoft, marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
};

const Momentum: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 60 }}>
    <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 84, color: fn.ink, textAlign: 'center' }}>
      Watch it add up.
    </div>
    <div style={{ display: 'flex', gap: 44 }}>
      <CountStat from={0} to={1240} label="Total XP" color={fn.gold} />
      <CountStat from={0} to={7} label="Day streak" color={fn.terra} suffix="🔥" />
      <CountStat from={980} to={1180} label="Predicted score" color={fn.teal} />
    </div>
  </AbsoluteFill>
);

// Beat 5: reassurance stat stickers.
const StatSticker: React.FC<{ text: string; color: string; tilt: number; delay: number; textColor?: string }> = ({
  text,
  color,
  tilt,
  delay,
  textColor = fn.card,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 11, mass: 0.6 } });
  return (
    <div
      style={{
        background: color,
        color: textColor,
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: 44,
        padding: '24px 40px',
        borderRadius: '16px 20px 14px 18px',
        border: `3px solid ${fn.ink}`,
        boxShadow: offsetShadow(7, fn.ink),
        transform: `scale(${interpolate(s, [0, 1], [0, 1])}) rotate(${tilt}deg)`,
      }}
    >
      {text}
    </div>
  );
};

const Reassurance: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 40 }}>
    <StatSticker text="1,000+ original questions" color={fn.terra} tilt={-2} delay={0} />
    <StatSticker text="No credit card" color={fn.teal} tilt={1.5} delay={10} />
    <StatSticker text="No setup — start in 60s" color={fn.gold} tilt={-1} delay={20} textColor={fn.ink} />
  </AbsoluteFill>
);

// Beat 6: CTA.
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const drawn = interpolate(frame, [18, 40], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 48 }}>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.85, 1])}) rotate(-2deg)`, opacity: s }}>
        <Logo scale={1.7} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 68, color: fn.terra }}>
          Start your first sprint free
        </div>
        <Underline progress={drawn} width={520} />
      </div>
      <div style={{ fontFamily: font.body, fontWeight: 600, fontSize: 40, color: fn.inkSoft }}>
        {BRAND.url}
      </div>
    </AbsoluteFill>
  );
};

export const Explainer: React.FC = () => {
  // 30s @ 30fps = 900 frames.
  return (
    <AbsoluteFill style={{ background: fn.paper }}>
      <Sequence durationInFrames={90}><Hook /></Sequence>
      <Sequence from={90} durationInFrames={180}><Sprints /></Sequence>
      <Sequence from={270} durationInFrames={180}><SpacedRep /></Sequence>
      <Sequence from={450} durationInFrames={180}><Momentum /></Sequence>
      <Sequence from={630} durationInFrames={150}><Reassurance /></Sequence>
      <Sequence from={780} durationInFrames={120}><CTA /></Sequence>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
