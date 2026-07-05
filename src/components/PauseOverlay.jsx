import React from 'react';
import { Play } from 'lucide-react';

// Covers the question content (no peeking) while a timed test-mode sprint
// or Practice Test module is paused. The timer/header stays visible outside
// this component; only the question area renders it, in place of the
// question content, per the approved design.
export default function PauseOverlay({ onResume }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '60px 24px', backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>Paused</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
        The timer is frozen and the question is hidden. Resume when you're ready to continue.
      </p>
      <button className="primary" onClick={onResume}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, fontWeight: 700 }}>
        <Play size={16} /> Resume
      </button>
    </div>
  );
}
