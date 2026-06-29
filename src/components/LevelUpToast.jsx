import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

export default function LevelUpToast({ level, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: '24px', left: '50%', transform: `translateX(-50%) translateY(${visible ? '0' : '-100px'})`,
      zIndex: 9999, transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.4s',
      opacity: visible ? 1 : 0,
      backgroundColor: 'var(--bg-card)', border: '2px solid var(--xp-gold)',
      borderRadius: '16px', padding: '16px 28px',
      display: 'flex', alignItems: 'center', gap: '14px',
      boxShadow: '0 8px 32px rgba(255,215,64,0.25)'
    }}>
      <Star size={28} fill="var(--xp-gold)" color="var(--xp-gold)" />
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--xp-gold)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>Level Up!</div>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Level {level}</div>
      </div>
    </div>
  );
}
