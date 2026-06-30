import React from 'react';
import { AbsoluteFill } from 'remotion';

// Subtle paper grain via an inline SVG feTurbulence, matching the app's .fn-grain.
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
  );
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        opacity,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }}
    />
  );
};
