import { useState, useEffect, useRef } from 'react';

// Animate a number from 0 to `target` once, on mount or when target changes.
// Eased (fast then settling) for a satisfying score reveal. Honors reduced-motion
// by jumping straight to the final value.
export function useCountUp(target, durationMs = 1100) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const final = Number(target) || 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || final === 0) { setValue(final); return; }

    let start = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const step = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      setValue(Math.round(ease(t) * final));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, durationMs]);

  return value;
}
