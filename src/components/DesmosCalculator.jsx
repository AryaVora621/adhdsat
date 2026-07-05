import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { loadDesmosCalculatorScript } from '../lib/loadDesmosScript';

// Embeds the real Desmos graphing calculator via the official API (not a
// plain iframe of desmos.com, which blocks framing via X-Frame-Options).
export default function DesmosCalculator({ onClose }) {
  const containerRef = useRef(null);
  const calcRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDesmosCalculatorScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad: true, expressions: true, settingsMenu: false,
        });
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  }, []);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 640, height: '70vh', maxHeight: 560,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '16px', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1, padding: 6, borderRadius: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
        }}><X size={18} /></button>
        {error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
            Could not load the calculator. Check your connection and try again.
          </div>
        ) : (
          <div ref={containerRef} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} />
        )}
      </div>
    </div>
  );
}
