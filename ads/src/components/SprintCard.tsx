import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fn, offsetShadow, orgRadius, font } from '../theme';

type Props = {
  // Frame (relative to the card's own start) at which the correct answer fills
  // teal and the XP sticker pops.
  revealFrame?: number;
  width?: number;
};

const OPTIONS = ['x = 5', 'x = 7', 'x = 9', 'x = 12'];
const CORRECT = 1; // index of "x = 7"

export const SprintCard: React.FC<Props> = ({ revealFrame = 40, width = 760 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entrance: drop + settle.
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.7 } });
  const cardY = interpolate(enter, [0, 1], [60, 0]);
  const cardRot = interpolate(enter, [0, 1], [-3, -1.2]);

  const revealed = frame >= revealFrame;

  // XP sticker pop after reveal.
  const xpSpring = spring({
    frame: frame - revealFrame - 6,
    fps,
    config: { damping: 9, mass: 0.6 },
  });
  const xpScale = revealed ? interpolate(xpSpring, [0, 1], [0, 1]) : 0;
  const xpRot = interpolate(xpSpring, [0, 1], [-18, -8]);

  return (
    <div
      style={{
        position: 'relative',
        width,
        transform: `translateY(${cardY}px) rotate(${cardRot}deg)`,
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
        <div
          style={{
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 2,
            color: fn.terra,
            marginBottom: 22,
            // Keep clear of the gold XP sticker that sits over the top-right corner.
            paddingRight: 150,
          }}
        >
          ⚡ FOCUS SPRINT
        </div>

        <div
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 44,
            color: fn.ink,
            marginBottom: 30,
            lineHeight: 1.15,
          }}
        >
          If 3x + 7 = 28, what is the value of x?
        </div>

        {OPTIONS.map((opt, i) => {
          const isCorrect = i === CORRECT;
          const lit = revealed && isCorrect;
          return (
            <div
              key={opt}
              style={{
                fontFamily: font.body,
                fontWeight: 600,
                fontSize: 30,
                color: lit ? fn.card : fn.ink,
                background: lit ? fn.teal : fn.paper,
                border: `2px solid ${lit ? fn.teal : fn.border}`,
                borderRadius: 14,
                padding: '18px 22px',
                marginBottom: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{opt}</span>
              {lit && <span style={{ fontSize: 30 }}>✓</span>}
            </div>
          );
        })}
      </div>

      {/* +40 XP! gold sticker */}
      <div
        style={{
          position: 'absolute',
          top: -34,
          right: -28,
          width: 132,
          height: 132,
          borderRadius: '50%',
          background: fn.gold,
          border: `3px solid ${fn.ink}`,
          boxShadow: offsetShadow(6, fn.ink),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${xpScale}) rotate(${xpRot}deg)`,
          fontFamily: font.display,
          color: fn.ink,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 800 }}>+40</span>
        <span style={{ fontSize: 26, fontWeight: 700 }}>XP!</span>
      </div>
    </div>
  );
};
