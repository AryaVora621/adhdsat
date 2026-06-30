import React from 'react';
import { interpolate } from 'remotion';
import { fn } from '../theme';

// Hand-drawn underline that draws on as `progress` (0..1) advances.
export const Underline: React.FC<{ progress: number; width?: number; color?: string }> = ({
  progress,
  width = 320,
  color = fn.terra,
}) => {
  const len = 240;
  const dashoffset = interpolate(progress, [0, 1], [len, 0]);
  return (
    <svg width={width} height={26} viewBox="0 0 200 16" style={{ display: 'block' }}>
      <path
        d="M3 12 C 50 4, 150 5, 197 10"
        stroke={color}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={dashoffset}
      />
    </svg>
  );
};
