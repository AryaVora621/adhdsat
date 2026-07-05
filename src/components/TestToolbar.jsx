import React from 'react';
import { Highlighter, Type, Eye, EyeOff, Calculator, BookOpen } from 'lucide-react';

const btnBase = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
  borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s',
};
const btnActive = {
  borderColor: 'var(--primary)', color: 'var(--primary)', backgroundColor: 'rgba(232, 100, 60,0.08)',
};

// Shared Bluebook-style toolbar for Sprint, PracticeTest, and ReviewSprint.
// `toolbar` is the object returned by useTestToolbarState(). `mathOnly` shows
// the calculator + reference sheet buttons only when the active question is
// a math question (matches the real Bluebook, which hides them on R&W).
export default function TestToolbar({ toolbar, mathOnly, onOpenCalculator, onOpenReference }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
      <button
        onClick={toolbar.toggleHighlightMode}
        style={{ ...btnBase, ...(toolbar.highlightMode ? btnActive : {}) }}
        title="Highlight: select text in the passage or question"
      >
        <Highlighter size={15} /> Highlight
      </button>
      <button onClick={toolbar.cycleTextSize} style={btnBase} title="Cycle text size">
        <Type size={15} /> Text {toolbar.textSize}
      </button>
      <button
        onClick={toolbar.toggleTimerHidden}
        style={{ ...btnBase, ...(toolbar.timerHidden ? btnActive : {}) }}
        title={toolbar.timerHidden ? 'Show timer' : 'Hide timer'}
      >
        {toolbar.timerHidden ? <EyeOff size={15} /> : <Eye size={15} />} Timer
      </button>
      {mathOnly && (
        <>
          <button onClick={onOpenCalculator} style={btnBase} title="Open calculator">
            <Calculator size={15} /> Calculator
          </button>
          <button onClick={onOpenReference} style={btnBase} title="Open reference sheet">
            <BookOpen size={15} /> Reference
          </button>
        </>
      )}
    </div>
  );
}
