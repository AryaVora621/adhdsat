import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause as PauseIcon, Settings2, Coffee, Timer } from 'lucide-react';
import { usePomodoro } from '../lib/usePomodoro';

const PRESETS = [
  { label: '25 / 5', work: 25, brk: 5 },
  { label: '15 / 5', work: 15, brk: 5 },
  { label: '50 / 10', work: 50, brk: 10 },
];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio unavailable (e.g. autoplay policy blocked it before any user
    // gesture) - the toast notification below still shows, so this is a
    // silent-but-harmless degrade rather than a broken feature.
  }
}

// Floating focus-session widget, mounted once at the App shell level so it
// survives route changes. Hidden on /practice-test (see App.jsx's focusRoute
// check) since Practice Test has its own strict timing UX.
export default function PomodoroWidget() {
  const pomo = usePomodoro();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const prevPhaseRef = useRef(pomo.phase);

  useEffect(() => {
    if (prevPhaseRef.current !== pomo.phase) {
      beep();
      setToast(pomo.phase === 'break' ? 'Work session done, take a break' : 'Break over, back to work');
      setTimeout(() => setToast(null), 4000);
    }
    prevPhaseRef.current = pomo.phase;
  }, [pomo.phase]);

  const mm = String(Math.floor(pomo.secondsLeft / 60)).padStart(2, '0');
  const ss = String(pomo.secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', right: 16, zIndex: 100 }}>
      {toast && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 10, whiteSpace: 'nowrap',
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}
      {settingsOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 10, width: 220,
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => pomo.applyPreset(p.work, p.brk)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'left' }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Custom</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min="1" max="120" value={pomo.workMinutes}
              onChange={(e) => pomo.setWorkMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 50, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>work /</span>
            <input type="number" min="1" max="60" value={pomo.breakMinutes}
              onChange={(e) => pomo.setBreakMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 50, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>break</span>
          </div>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}>
        {pomo.phase === 'work' ? <Timer size={16} color="var(--primary)" /> : <Coffee size={16} color="var(--xp-gold)" />}
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{mm}:{ss}</span>
        <button onClick={pomo.running ? pomo.pause : pomo.start} title={pomo.running ? 'Pause' : 'Start'}
          style={{ display: 'flex', padding: 4, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
          {pomo.running ? <PauseIcon size={15} /> : <Play size={15} />}
        </button>
        <button onClick={() => setSettingsOpen((v) => !v)} title="Settings"
          style={{ display: 'flex', padding: 4, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
          <Settings2 size={15} />
        </button>
      </div>
    </div>
  );
}
