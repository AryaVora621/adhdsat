import React from 'react';
import { Strikethrough } from 'lucide-react';

// Small cross-out control rendered inline on each answer choice. Purely a
// visual elimination aid, matching real Bluebook: a struck choice stays
// clickable and selectable, it is not locked out.
export default function StrikeToggle({ struck, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={struck ? 'Restore choice' : 'Cross out choice'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
        border: `1px solid ${struck ? 'var(--primary)' : 'var(--border)'}`,
        backgroundColor: struck ? 'rgba(232, 100, 60,0.1)' : 'transparent',
        color: struck ? 'var(--primary)' : 'var(--text-secondary)',
      }}
    >
      <Strikethrough size={13} />
    </button>
  );
}
