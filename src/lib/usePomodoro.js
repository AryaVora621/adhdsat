import { useState, useRef, useEffect, useCallback } from 'react';

const WORK_KEY = 'tally-pomodoro-work';
const BREAK_KEY = 'tally-pomodoro-break';

// Independent focus-session clock, separate from any in-progress sprint
// timer. Never pauses or reacts to sprint state; it's purely for the user's
// own work/break rhythm. Ticks via Date.now() deltas (like Sprint.jsx's own
// timer) so it stays accurate even if the tab is backgrounded and throttled.
export function usePomodoro() {
  const [workMinutes, setWorkMinutesState] = useState(
    () => parseInt(localStorage.getItem(WORK_KEY), 10) || 25
  );
  const [breakMinutes, setBreakMinutesState] = useState(
    () => parseInt(localStorage.getItem(BREAK_KEY), 10) || 5
  );
  const [phase, setPhase] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(() => (parseInt(localStorage.getItem(WORK_KEY), 10) || 25) * 60);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef(null);
  const targetTimeRef = useRef(null);

  useEffect(() => { localStorage.setItem(WORK_KEY, String(workMinutes)); }, [workMinutes]);
  useEffect(() => { localStorage.setItem(BREAK_KEY, String(breakMinutes)); }, [breakMinutes]);

  const phaseMinutes = useCallback(
    (p) => (p === 'work' ? workMinutes : breakMinutes),
    [workMinutes, breakMinutes]
  );

  const tick = useCallback(() => {
    const remaining = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      clearInterval(intervalRef.current);
      setPhase((prev) => {
        const next = prev === 'work' ? 'break' : 'work';
        targetTimeRef.current = Date.now() + phaseMinutes(next) * 60 * 1000;
        setSecondsLeft(phaseMinutes(next) * 60);
        intervalRef.current = setInterval(tick, 1000);
        return next;
      });
    }
  }, [phaseMinutes]);

  const start = useCallback(() => {
    if (running) return;
    targetTimeRef.current = Date.now() + secondsLeft * 1000;
    intervalRef.current = setInterval(tick, 1000);
    setRunning(true);
  }, [running, secondsLeft, tick]);

  const pause = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
  }, [workMinutes]);

  const applyPreset = useCallback((work, brk) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setWorkMinutesState(work);
    setBreakMinutesState(brk);
    setPhase('work');
    setSecondsLeft(work * 60);
  }, []);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return {
    phase, secondsLeft, running,
    workMinutes, breakMinutes,
    start, pause, reset, applyPreset,
    setWorkMinutes: setWorkMinutesState,
    setBreakMinutes: setBreakMinutesState,
  };
}
