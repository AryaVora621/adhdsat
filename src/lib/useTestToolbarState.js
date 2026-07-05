import { useState, useCallback, useEffect } from 'react';

const TEXT_SIZES = ['S', 'M', 'L', 'XL'];
export const TEXT_SIZE_SCALE = { S: 0.85, M: 1, L: 1.15, XL: 1.3 };
const TEXT_SIZE_KEY = 'tally-textsize';
const TIMER_HIDDEN_KEY = 'tally-timer-hidden';

// Shared annotation/preference state for the Bluebook-style toolbar, used by
// Sprint, PracticeTest, and ReviewSprint. Highlights and struck choices reset
// per question (call resetPerQuestion when the active question changes);
// text size and hide-timer are the only settings that persist, globally,
// across questions and sessions.
export function useTestToolbarState() {
  const [textSize, setTextSizeState] = useState(() => {
    const saved = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.includes(saved) ? saved : 'M';
  });
  const [timerHidden, setTimerHiddenState] = useState(
    () => localStorage.getItem(TIMER_HIDDEN_KEY) === 'true'
  );
  const [highlightMode, setHighlightMode] = useState(false);
  const [struckChoices, setStruckChoices] = useState(() => new Set());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  useEffect(() => { localStorage.setItem(TEXT_SIZE_KEY, textSize); }, [textSize]);
  useEffect(() => { localStorage.setItem(TIMER_HIDDEN_KEY, String(timerHidden)); }, [timerHidden]);

  const cycleTextSize = useCallback(() => {
    setTextSizeState((prev) => TEXT_SIZES[(TEXT_SIZES.indexOf(prev) + 1) % TEXT_SIZES.length]);
  }, []);

  const toggleTimerHidden = useCallback(() => setTimerHiddenState((h) => !h), []);
  const toggleHighlightMode = useCallback(() => setHighlightMode((h) => !h), []);

  const toggleStrike = useCallback((label) => {
    setStruckChoices((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }, []);

  const resetPerQuestion = useCallback(() => {
    setStruckChoices(new Set());
    setHighlightMode(false);
  }, []);

  return {
    textSize, cycleTextSize,
    timerHidden, toggleTimerHidden,
    highlightMode, toggleHighlightMode,
    struckChoices, toggleStrike,
    calculatorOpen, setCalculatorOpen,
    referenceOpen, setReferenceOpen,
    resetPerQuestion,
  };
}
