import React from 'react';
import { fn, offsetShadow, font } from '../theme';
import { BRAND } from '../brand';

// Bolt-in-tile mark + wordmark, matching the landing nav lockup.
export const Logo: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 * scale }}>
    <div
      style={{
        width: 72 * scale,
        height: 72 * scale,
        borderRadius: `${16 * scale}px ${20 * scale}px ${14 * scale}px ${18 * scale}px`,
        background: fn.terra,
        border: `3px solid ${fn.ink}`,
        boxShadow: offsetShadow(5 * scale, fn.ink),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40 * scale,
        transform: 'rotate(-3deg)',
      }}
    >
      ⚡
    </div>
    <span
      style={{
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: 56 * scale,
        color: fn.ink,
        letterSpacing: '-0.01em',
      }}
    >
      {BRAND.name}
    </span>
  </div>
);
