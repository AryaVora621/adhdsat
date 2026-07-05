import React from 'react';

// Esc-quit confirmation for regular (untimed) sprints only. Timed test-mode
// sprints and Practice Test use Pause instead (see PauseOverlay.jsx); real
// Bluebook keeps these two flows separate rather than overloading one key.
export default function QuitConfirmDialog({ onResume, onQuitSave, onQuitDiscard }) {
  return (
    <div onClick={onResume} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 20, padding: '28px',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 10, color: 'var(--text-primary)' }}>Quit sprint?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: '0.9rem', lineHeight: 1.5 }}>
          You can save your progress on the questions you've already answered, or discard this sprint entirely.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="primary" onClick={onResume} style={{ padding: '12px', borderRadius: 12, fontWeight: 700 }}>
            Resume
          </button>
          <button onClick={onQuitSave} style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}>
            Quit & Save
          </button>
          <button onClick={onQuitDiscard} style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--error)', color: 'var(--error)', backgroundColor: 'transparent' }}>
            Quit & Discard
          </button>
        </div>
      </div>
    </div>
  );
}
