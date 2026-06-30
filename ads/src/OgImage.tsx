import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fn, offsetShadow, orgRadius, font } from './theme';
import { Grain } from './components/Grain';
import { Logo } from './components/Logo';
import { BRAND } from './brand';
import './fonts';

// Static 1200x630 social card. Rendered as a still to public/og-image.png.
export const OgImage: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: fn.paper }}>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 90px', gap: 60 }}>
        <div style={{ flex: 1.2 }}>
          <div style={{ marginBottom: 36 }}>
            <Logo scale={1.15} />
          </div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 76, color: fn.ink, lineHeight: 1.05 }}>
            SAT prep that
            <br />
            counts every win.
          </div>
          <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 30, color: fn.inkSoft, marginTop: 26 }}>
            Short sprints · instant feedback · {BRAND.url}
          </div>
        </div>

        {/* Mini sticker proof. */}
        <div style={{ flex: 0.85, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div
            style={{
              background: fn.card,
              border: `3px solid ${fn.ink}`,
              borderRadius: orgRadius,
              boxShadow: offsetShadow(9, fn.ink),
              padding: '30px 34px',
              width: 380,
              transform: 'rotate(-2deg)',
            }}
          >
            <div style={{ fontFamily: font.body, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: fn.terra, marginBottom: 16 }}>
              ⚡ FOCUS SPRINT
            </div>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 28, color: fn.ink, marginBottom: 18 }}>
              3x + 7 = 28
            </div>
            <div style={{ background: fn.teal, color: fn.card, fontFamily: font.body, fontWeight: 600, fontSize: 24, padding: '12px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>x = 7</span>
              <span>✓</span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: 20,
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: fn.gold,
              border: `3px solid ${fn.ink}`,
              boxShadow: offsetShadow(5, fn.ink),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: font.display,
              color: fn.ink,
              transform: 'rotate(-10deg)',
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 800 }}>+40</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>XP!</span>
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
