import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, ChevronLeft, AlertCircle, Zap, Trophy, Calculator, BookOpen, Shuffle, FileText } from 'lucide-react';
import MathText from '../components/MathText';

function WrongAnswerCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '10px', border: '1px solid rgba(255,82,82,0.2)', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', textAlign: 'left', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0, marginTop: '2px', minWidth: '80px' }}>{item.domain.split(' ')[0]}</span>
        <span style={{ flex: 1, fontSize: '0.88rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>{item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text}</span>
        <span style={{ fontSize: '0.72rem', color: expanded ? 'var(--primary)' : 'var(--text-secondary)', flexShrink: 0 }}>{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', marginBottom: '10px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--error)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px' }}>You chose</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{item.selectedLabel ? `${item.selectedLabel}: ` : ''}{item.selectedText}</div>
            </div>
            <div>
              <span style={{ color: 'var(--success)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Correct</span>
              <div style={{ color: 'var(--success)', marginTop: '2px', fontWeight: '600' }}>{item.correctLabel ? `${item.correctLabel}: ` : ''}{item.correctAnswer}</div>
            </div>
          </div>
          {item.explanation && (
            <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <MathText>{item.explanation}</MathText>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: ['#00d4ff', '#00e676', '#ffd740', '#ff5252', '#e040fb'][i % 5],
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 9998 }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: '-20px', left: `${p.left}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          backgroundColor: p.color, borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          transform: `rotate(${p.rotate}deg)`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

function SummaryScreen({ finalStats, sprintId, accuracy, grade, SPRINT_LENGTH, navigate, onSprintAgain, wrongAnswers, isTestMode, testTimeUsed }) {
  const [breakdown, setBreakdown] = useState(null);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!sprintId) return;
    fetch(`/api/sprints/${sprintId}/breakdown`)
      .then(r => r.json())
      .then(setBreakdown)
      .catch(() => {});
  }, [sprintId]);

  useEffect(() => {
    if (!accuracy || finalStats.attempted < 3) return;
    const prev = parseFloat(localStorage.getItem('bestSprintAccuracy') || '0');
    if (accuracy > prev) {
      localStorage.setItem('bestSprintAccuracy', String(accuracy));
      setIsPersonalBest(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [accuracy]);

  const domainColor = (acc) => acc >= 70 ? 'var(--success)' : acc >= 50 ? 'var(--xp-gold)' : 'var(--error)';

  return (
    <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '600px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
      {showConfetti && <Confetti />}
      <Trophy size={48} color="var(--xp-gold)" style={{ marginBottom: '24px' }} />
      <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>{isTestMode ? 'Test Complete!' : 'Sprint Complete!'}</h1>
      {isTestMode && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,215,64,0.08)', border: '1px solid rgba(255,215,64,0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--xp-gold)', fontWeight: '600', fontSize: '0.8rem' }}>Practice Test Simulation</span>
        </div>
      )}
      {isPersonalBest && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,215,64,0.1)', border: '1px solid rgba(255,215,64,0.5)', borderRadius: '20px', padding: '6px 16px', marginBottom: '12px' }}>
          <Trophy size={14} color="var(--xp-gold)" />
          <span style={{ color: 'var(--xp-gold)', fontWeight: '700', fontSize: '0.85rem' }}>New Personal Best!</span>
        </div>
      )}
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {SPRINT_LENGTH} questions{testTimeUsed ? ` · ${Math.floor(testTimeUsed / 60)}:${String(testTimeUsed % 60).padStart(2, '0')} used` : ' finished'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Correct', value: `${finalStats.correct}/${finalStats.attempted}` },
          { label: 'Accuracy', value: `${accuracy}%`, color: grade.color },
          { label: 'XP Earned', value: `+${finalStats.xp}`, color: 'var(--xp-gold)' }
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--bg-card)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border)', minWidth: 0 }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 'bold', color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', borderRadius: '14px', border: `2px solid ${grade.color}`, marginBottom: '24px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: grade.color }}>{grade.label}</span>
      </div>

      {accuracy < 55 && (
        <div style={{
          backgroundColor: 'rgba(0,230,118,0.08)',
          border: '1px solid rgba(0,230,118,0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            lineHeight: 1.6
          }}>
            <strong>Learning in progress!</strong> Struggle is normal on the SAT journey.
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '10px' }}>
              Your lowest domain: <strong>{breakdown?.domains?.length > 0 ? breakdown.domains.reduce((a, b) => a.accuracy < b.accuracy ? a : b).domain : 'Mixed'}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>
              Improvement typically kicks in by sprint 5. Keep practicing -- you're building the skills.
            </div>
          </div>
        </div>
      )}

      {isTestMode && breakdown?.domains?.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
            Practice Test Analysis
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Focus Next</div>
            <div style={{ fontSize: '1rem', color: 'var(--error)', fontWeight: '700' }}>
              {breakdown.domains.reduce((a, b) => a.accuracy < b.accuracy ? a : b).domain} ({breakdown.domains.reduce((a, b) => a.accuracy < b.accuracy ? a : b).accuracy}%)
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Readiness Score</div>
            <div style={{ fontSize: '1rem', color: accuracy >= 70 ? 'var(--success)' : 'var(--xp-gold)', fontWeight: '700' }}>
              {accuracy}% - {accuracy >= 70 ? 'Ready for test' : accuracy >= 60 ? 'Nearly ready (1-2 weeks)' : 'Needs focused practice'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Domain Performance
            </div>
            {breakdown.domains.map(d => (
              <div key={d.domain} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.domain}</span>
                <div style={{ width: '60px', height: '3px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.accuracy}%`, height: '100%', backgroundColor: d.accuracy > 70 ? 'var(--success)' : d.accuracy > 50 ? 'var(--xp-gold)' : 'var(--error)' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: d.accuracy > 70 ? 'var(--success)' : d.accuracy > 50 ? 'var(--xp-gold)' : 'var(--error)', minWidth: '32px', textAlign: 'right' }}>{d.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown?.domains?.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Domain Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {breakdown.domains.map(d => (
              <div key={d.domain} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.domain}</span>
                <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.accuracy}%`, height: '100%', backgroundColor: domainColor(d.accuracy) }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: domainColor(d.accuracy), minWidth: '38px', textAlign: 'right' }}>{d.accuracy}%</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '30px' }}>{d.correct}/{d.total}</span>
              </div>
            ))}
          </div>
          {breakdown.totalTime > 0 && (
            <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              Total time: {Math.floor(breakdown.totalTime / 60)}m {breakdown.totalTime % 60}s
            </div>
          )}
        </div>
      )}

      {wrongAnswers?.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={13} color="var(--error)" />
            {wrongAnswers.length} Wrong Answer{wrongAnswers.length !== 1 ? 's' : ''} -- tap to review
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {wrongAnswers.map((item, i) => <WrongAnswerCard key={i} item={item} />)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => navigate('/review')}
          style={{ flex: 1, padding: '14px', fontSize: '0.9rem', borderColor: 'rgba(255,215,64,0.3)', color: 'var(--xp-gold)' }}>
          Review Errors
        </button>
        <button className="primary" onClick={onSprintAgain}
          style={{ flex: 2, padding: '14px', fontSize: '1rem' }}>
          Sprint Again
        </button>
      </div>
      <button onClick={() => navigate('/')} style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Back to Dashboard
      </button>
      <p style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Press Enter for Dashboard</p>
    </div>
  );
}

const DIFF_XP = { easy: 15, medium: 20, hard: 30 };

export default function Sprint({ user, setUser }) {
  const [sprintMode, setSprintModeState] = useState(() => sessionStorage.getItem('lastSprintMode') || null);
  const setSprintMode = (mode) => {
    setSprintModeState(mode);
    if (mode) sessionStorage.setItem('lastSprintMode', mode);
  };
  const sprintModeRef = useRef(null);
  const [sprintId, setSprintId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);
  const [stats, setStats] = useState({ attempted: 0, correct: 0, xp: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const savedLen = parseInt(sessionStorage.getItem('preferredSprintLength') || '10', 10);
  const [sprintLength, setSprintLength] = useState(savedLen);
  const sprintLengthRef = useRef(savedLen);
  const [resumePrompt, setResumePrompt] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const isTestModeRef = useRef(false);
  const [testTimeLimit, setTestTimeLimit] = useState(0); // seconds, 0 = no limit
  const testTimeLimitRef = useRef(0);
  const endSprintRef = useRef(null); // ref to force-end sprint when time expires

  const prefetchedQuestionRef = useRef(null);

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [deepDiveText, setDeepDiveText] = useState('');
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);

  // Live timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const timeStartRef = useRef(Date.now());
  const sprintStartRef = useRef(null);
  const milestoneShownRef = useRef(new Set());
  const [milestone, setMilestone] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const SPRINT_LENGTH = sprintLengthRef.current;

  // Auto-start from Dashboard navigation state, saved recovery state, or remembered mode
  useEffect(() => {
    const saved = sessionStorage.getItem('activeSprint');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.sprintId && state.questionNum > 1) {
          setResumePrompt(state);
          return;
        }
      } catch {}
    }
    const preMode = location.state?.mode;
    const remembered = sessionStorage.getItem('lastSprintMode');
    const modeToStart = preMode || remembered;
    if (modeToStart) startSprint(modeToStart);
  }, []);

  const MILESTONES = [
    { seconds: 120, label: '2 min in -- keep going!' },
    { seconds: 300, label: '5 minutes -- you\'re on fire!' },
    { seconds: 600, label: '10 min -- serious focus mode!' },
  ];

  // Start per-question timer
  const startTimer = () => {
    clearInterval(timerRef.current);
    setElapsed(0);
    timeStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - timeStartRef.current) / 1000));
      // Check sprint-level time milestones
      if (sprintStartRef.current) {
        const sprintElapsed = Math.floor((now - sprintStartRef.current) / 1000);
        // Test mode: auto-end sprint when countdown hits 0
        if (isTestModeRef.current && testTimeLimitRef.current > 0) {
          const remaining = testTimeLimitRef.current - sprintElapsed;
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            // Trigger sprint end by setting questionNum past length
            setQuestionNum(prev => {
              endSprintRef.current?.();
              return prev;
            });
            return;
          }
        }
        if (!isTestModeRef.current) {
          for (const m of MILESTONES) {
            if (sprintElapsed >= m.seconds && !milestoneShownRef.current.has(m.seconds)) {
              milestoneShownRef.current.add(m.seconds);
              setMilestone(m.label);
              setTimeout(() => setMilestone(null), 3000);
              break;
            }
          }
        }
      }
    }, 1000);
  };

  const stopTimer = () => clearInterval(timerRef.current);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startSprint = async (mode) => {
    // Test modes: full-section timed simulation
    const testModeMap = { 'test-math': { section: 'math', seconds: 35 * 60, questions: 22 }, 'test-english': { section: 'english', seconds: 32 * 60, questions: 27 } };
    const testConfig = testModeMap[mode];
    const effectiveMode = testConfig ? testConfig.section : mode;
    const isTest = !!testConfig;
    isTestModeRef.current = isTest;
    setIsTestMode(isTest);
    if (testConfig) {
      sprintLengthRef.current = testConfig.questions;
      setSprintLength(testConfig.questions);
      testTimeLimitRef.current = testConfig.seconds;
      setTestTimeLimit(testConfig.seconds);
    } else {
      testTimeLimitRef.current = 0;
      setTestTimeLimit(0);
    }
    sprintModeRef.current = effectiveMode;
    setSprintMode(effectiveMode);
    setLoading(true);
    sprintStartRef.current = Date.now();
    milestoneShownRef.current = new Set();
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sprint_type: mode })
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setLoading(false);
        navigate('/upgrade', { state: { reason: body.error === 'daily_limit' ? 'daily_limit' : body.feature } });
        return;
      }
      const data = await res.json();
      setSprintId(data.id);
      await fetchNextQuestion();
    } catch {

      setLoading(false);
    }
  };

  const fetchQuestionFromAPI = async () => {
    const mode = sprintModeRef.current;
    const sectionParam = mode && mode !== 'adaptive' ? `&section=${mode}` : '';
    const res = await fetch(`/api/questions/next?userId=${user.id}${sectionParam}`);
    if (!res.ok) throw new Error('No questions');
    return res.json();
  };

  const prefetchNextQuestion = () => {
    fetchQuestionFromAPI()
      .then(q => { prefetchedQuestionRef.current = q; })
      .catch(() => {});
  };

  const fetchNextQuestion = async () => {
    setSelectedChoice(null);
    setIsAnswered(false);
    setHintsUsed(0);
    setDeepDiveText('');
    setShowDeepDive(false);
    // Use pre-fetched question if available for instant transition
    if (prefetchedQuestionRef.current) {
      const q = prefetchedQuestionRef.current;
      prefetchedQuestionRef.current = null;
      setQuestion(q);
      setLoading(false);
      startTimer();
      return;
    }
    setLoading(true);
    try {
      const q = await fetchQuestionFromAPI();
      setQuestion(q);
      startTimer();
    } catch {

    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = useCallback(async (choiceOverride) => {
    const choice = choiceOverride ?? selectedChoice;
    if (!choice) return;
    if (isAnswered) return;

    stopTimer();
    const timeSpent = Math.round((Date.now() - timeStartRef.current) / 1000);

    let correct = false;
    if (question.is_grid_in) {
      correct = parseFloat(choice) === question.grid_in_answer;
    } else {
      const ch = question.choices.find(c => c.label === choice);
      if (ch?.is_correct) correct = true;
    }

    const xpGained = correct ? (DIFF_XP[question.difficulty] || 20) : 5;

    setIsAnswered(true);
    setStats(prev => ({
      attempted: prev.attempted + 1,
      correct: prev.correct + (correct ? 1 : 0),
      xp: prev.xp + xpGained
    }));

    if (!correct) {
      const correctAnswer = question.is_grid_in
        ? String(question.grid_in_answer)
        : question.choices.find(c => c.is_correct)?.text || '';
      setWrongAnswers(prev => [...prev, {
        id: question.id,
        text: question.question_text,
        domain: question.domain,
        selectedChoice: choice,
        selectedText: question.choices.find(c => c.label === choice)?.text || choice,
        correctLabel: question.choices.find(c => c.is_correct)?.label || '',
        correctAnswer,
        explanation: question.explanation || ''
      }]);
    }

    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          question_id: question.id,
          selected_choice: choice,
          is_correct: correct ? 1 : 0,
          hints_used: hintsUsed,
          time_spent_seconds: timeSpent,
          sprint_id: sprintId
        })
      });
      const userRes = await fetch(`/api/users/${user.id}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp_gained: xpGained })
      });
      setUser(await userRes.json());

      // Autosave recovery state including wrong answers for post-sprint review
      const nextStats = { attempted: stats.attempted + 1, correct: stats.correct + (correct ? 1 : 0), xp: stats.xp + xpGained };
      const currentWrong = !correct ? [...wrongAnswers, {
        id: question.id, text: question.question_text, domain: question.domain,
        selectedChoice: choice, selectedText: question.choices?.find(c => c.label === choice)?.text || choice,
        correctLabel: question.choices?.find(c => c.is_correct)?.label || '',
        correctAnswer: question.is_grid_in ? String(question.grid_in_answer) : question.choices?.find(c => c.is_correct)?.text || '',
        explanation: question.explanation || ''
      }] : wrongAnswers;
      try {
        sessionStorage.setItem('activeSprint', JSON.stringify({
          sprintId, mode: sprintModeRef.current,
          questionNum: questionNum + 1, stats: nextStats,
          sprintLength: sprintLengthRef.current,
          wrongAnswers: currentWrong.slice(-20)
        }));
      } catch { /* storage full, skip */ }
      // Pre-fetch next question while user reads explanation (not needed after last Q)
      if (questionNum < sprintLengthRef.current) prefetchNextQuestion();
    } catch {

    }
  }, [selectedChoice, question, isAnswered, hintsUsed, sprintId, stats, questionNum, user.id]);

  const finishSprint = useCallback(async (currentStats) => {
    const current = currentStats || stats;
    stopTimer();
    try {
      await fetch(`/api/sprints/${sprintId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions_attempted: current.attempted,
          questions_correct: current.correct,
          xp_earned: current.xp
        })
      });
    } catch {}
    sessionStorage.removeItem('activeSprint');
    setFinalStats(current);
    setShowSummary(true);
  }, [sprintId, stats]);

  // Expose finishSprint via ref so the timer interval can call it
  useEffect(() => { endSprintRef.current = () => finishSprint(stats); }, [finishSprint, stats]);

  const handleNext = useCallback(async () => {
    const current = stats;
    if (questionNum >= sprintLengthRef.current) {
      await finishSprint(current);
    } else {
      // Fire halfway milestone when crossing the midpoint
      const half = Math.floor(sprintLengthRef.current / 2);
      if (questionNum === half && !milestoneShownRef.current.has('half')) {
        milestoneShownRef.current.add('half');
        setMilestone('Halfway there -- keep it up!');
        setTimeout(() => setMilestone(null), 2800);
      }
      setQuestionNum(n => n + 1);
      await fetchNextQuestion();
    }
  }, [questionNum, sprintId, stats, finishSprint]);

  // Keyboard shortcuts: 1-4 pick choice, Enter submits / advances
  useEffect(() => {
    const onKey = (e) => {
      if (!question || loading || showSummary) return;
      if (e.target.tagName === 'INPUT') return;

      if (!isAnswered) {
        if (['1','2','3','4'].includes(e.key) && !question.is_grid_in) {
          const labels = ['A','B','C','D'];
          const label = labels[parseInt(e.key) - 1];
          if (label && question.choices.find(c => c.label === label)) {
            setSelectedChoice(label);
          }
        }
        if (e.key === 'Enter') {
          handleAnswerSubmit();
        }
        if (e.key === 'h' || e.key === 'H') {
          if (hintsUsed < 2) setHintsUsed(h => h + 1);
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, isAnswered, loading, showSummary, selectedChoice, hintsUsed, handleAnswerSubmit, handleNext]);

  // Summary screen: Enter navigates to dashboard
  useEffect(() => {
    if (!showSummary) return;
    const onKey = (e) => { if (e.key === 'Enter') navigate('/'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSummary, navigate]);

  const handleDeepDive = async () => {
    if (user.plan !== 'paid') {
      navigate('/upgrade', { state: { reason: 'AI breakdowns' } });
      return;
    }
    setDeepDiveLoading(true);
    setShowDeepDive(true);
    setDeepDiveText('');
    try {
      const correctAnswer = question.choices.find(c => c.is_correct)?.text
        || question.grid_in_answer?.toString()
        || 'Unknown';
      const selectedText = question.choices.find(c => c.label === selectedChoice)?.text || selectedChoice;
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.question_text,
          selectedChoice: `${selectedChoice}: ${selectedText}`,
          correctAnswer,
          userId: user.id
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) setDeepDiveText(prev => prev + parsed.text);
          } catch {}
        }
      }
    } catch {
      setDeepDiveText('Could not load deep dive explanation.');
    } finally {
      setDeepDiveLoading(false);
    }
  };

  // Sprint summary screen
  if (showSummary && finalStats) {
    const accuracy = finalStats.attempted > 0 ? Math.round((finalStats.correct / finalStats.attempted) * 100) : 0;
    const grade = accuracy >= 90 ? { label: 'Excellent', color: 'var(--success)' }
      : accuracy >= 70 ? { label: 'Good', color: 'var(--primary)' }
      : accuracy >= 50 ? { label: 'Keep Going', color: 'var(--xp-gold)' }
      : { label: 'Needs Work', color: 'var(--error)' };

    const handleSprintAgain = () => {
      const currentMode = sprintModeRef.current;
      setShowSummary(false); setFinalStats(null);
      setStats({ attempted: 0, correct: 0, xp: 0 }); setQuestionNum(1);
      setQuestion(null); setLoading(false); setSprintId(null);
      setWrongAnswers([]);
      setMilestone(null);
      sprintStartRef.current = null;
      milestoneShownRef.current = new Set();
      sessionStorage.removeItem('activeSprint');
      // Keep same mode -- restart immediately without going to picker
      if (currentMode) startSprint(currentMode);
      else { setSprintMode(null); sprintModeRef.current = null; }
    };
    return (
      <SummaryScreen
        finalStats={finalStats}
        sprintId={sprintId}
        accuracy={accuracy}
        grade={grade}
        SPRINT_LENGTH={SPRINT_LENGTH}
        navigate={navigate}
        onSprintAgain={handleSprintAgain}
        wrongAnswers={wrongAnswers}
        isTestMode={isTestMode}
        testTimeUsed={isTestMode && sprintStartRef.current ? Math.floor((Date.now() - sprintStartRef.current) / 1000) : 0}
      />
    );
  }

  // Resume prompt: shown when there's a saved sprint from a previous session
  if (resumePrompt) {
    return (
      <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(0,212,255,0.3)', textAlign: 'center' }}>
          <Zap size={36} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>Unfinished Sprint</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            You were on Q{resumePrompt.questionNum} of {resumePrompt.sprintLength || 10} ({resumePrompt.stats?.correct || 0} correct so far).<br />
            Want to pick up where you left off?
          </p>
          <button className="primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: '10px' }}
            onClick={() => {
              const s = resumePrompt;
              sprintModeRef.current = s.mode;
              setSprintModeState(s.mode);
              setSprintId(s.sprintId);
              setQuestionNum(s.questionNum);
              setStats(s.stats || { attempted: 0, correct: 0, xp: 0 });
              if (s.wrongAnswers?.length) setWrongAnswers(s.wrongAnswers);
              sprintLengthRef.current = s.sprintLength || 10;
              setSprintLength(s.sprintLength || 10);
              sprintStartRef.current = Date.now();
              setResumePrompt(null);
              fetchNextQuestion();
            }}>
            Resume Sprint
          </button>
          <button style={{ width: '100%', padding: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
            onClick={() => {
              sessionStorage.removeItem('activeSprint');
              setResumePrompt(null);
              const remembered = sessionStorage.getItem('lastSprintMode');
              if (remembered) startSprint(remembered);
            }}>
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  // Mode picker - shown before sprint starts
  if (sprintMode === null) {
    const modes = [
      { key: 'adaptive', label: 'Adaptive', sub: 'AI picks based on your weaknesses', icon: <Shuffle size={28} /> },
      { key: 'math', label: 'Math', sub: 'Algebra, Advanced Math, Geometry...', icon: <Calculator size={28} /> },
      { key: 'english', label: 'English', sub: 'Reading, Writing & Language...', icon: <BookOpen size={28} /> },
    ];
    const testModes = [
      { key: 'test-math', label: 'Math Module', sub: '22 questions · 35 min · one timed section only', icon: <Calculator size={24} />, time: '35 min' },
      { key: 'test-english', label: 'Reading & Writing Module', sub: '27 questions · 32 min · one timed section only', icon: <BookOpen size={24} />, time: '32 min' },
    ];
    return (
      <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Choose Sprint Mode</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Pick your focus and length</p>

        {/* Length selector */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Sprint Length</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[5, 10, 15, 20].map(n => (
              <button key={n} onClick={() => { setSprintLength(n); sprintLengthRef.current = n; sessionStorage.setItem('preferredSprintLength', n); }}
                style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', border: `2px solid ${sprintLength === n ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sprintLength === n ? 'rgba(0,212,255,0.08)' : 'transparent', color: sprintLength === n ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                {n}Q
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {modes.map(m => (
            <button key={m.key} onClick={() => startSprint(m.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <span style={{ color: 'var(--primary)' }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{sprintLength} questions</span>
            </button>
          ))}
        </div>

        {/* Practice Test section */}
        <div style={{ marginTop: '28px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--xp-gold)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>Practice Test</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/practice-test')}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', backgroundColor: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'}>
              <span style={{ color: 'var(--primary)' }}><FileText size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '2px' }}>Full Practice Test</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Both sections, timed, scored 400-1600</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', flexShrink: 0, backgroundColor: 'rgba(0,212,255,0.1)', padding: '3px 8px', borderRadius: '8px' }}>~67 min</span>
            </button>
            {testModes.map(m => (
              <button key={m.key} onClick={() => startSprint(m.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', backgroundColor: 'rgba(255,215,64,0.04)', border: '1px solid rgba(255,215,64,0.2)', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,64,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,215,64,0.2)'}>
                <span style={{ color: 'var(--xp-gold)' }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '2px' }}>{m.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--xp-gold)', fontWeight: '600', flexShrink: 0, backgroundColor: 'rgba(255,215,64,0.1)', padding: '3px 8px', borderRadius: '8px' }}>{m.time}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 'clamp(16px, 5vw, 48px)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        Loading question {questionNum}...
      </div>
    );
  }
  if (!question) {
    return (
      <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '460px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--xp-gold)" style={{ marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '8px' }}>Could not load a question</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
          Check your connection and try again.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="primary" onClick={() => fetchNextQuestion()} style={{ padding: '12px 28px' }}>Retry</button>
          <button onClick={() => navigate('/')} style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const isCorrect = question.is_grid_in
    ? parseFloat(selectedChoice) === question.grid_in_answer
    : question.choices.find(c => c.label === selectedChoice)?.is_correct;

  // In test mode, show countdown; otherwise show count-up per-question timer
  const sprintElapsedSec = sprintStartRef.current ? Math.floor((Date.now() - sprintStartRef.current) / 1000) : 0;
  const countdown = isTestMode && testTimeLimit > 0 ? Math.max(0, testTimeLimit - sprintElapsedSec) : null;
  const timerColor = countdown !== null
    ? (countdown < 300 ? 'var(--error)' : countdown < 600 ? 'var(--xp-gold)' : 'var(--primary)')
    : (elapsed < 60 ? 'var(--text-secondary)' : elapsed < 120 ? 'var(--xp-gold)' : 'var(--error)');
  const timerSec = countdown !== null ? countdown : elapsed;
  const timerStr = `${Math.floor(timerSec / 60)}:${String(timerSec % 60).padStart(2, '0')}`;

  return (
    <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes milestoneIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes milestoneOut { from { opacity: 1; } to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Milestone toast */}
      {milestone && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.4)',
          borderRadius: '24px', padding: '10px 22px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'milestoneIn 0.25s ease-out',
          backdropFilter: 'blur(8px)'
        }}>
          <CheckCircle2 size={16} color="var(--success)" />
          <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.9rem' }}>{milestone}</span>
        </div>
      )}

      {/* Progress bar + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {Array.from({ length: SPRINT_LENGTH }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '5px', borderRadius: '3px',
              backgroundColor: i < questionNum - 1 ? 'var(--primary)' : i === questionNum - 1 ? 'rgba(0,212,255,0.4)' : 'var(--border)',
              transition: 'background-color 0.3s'
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '100px', justifyContent: 'flex-end' }}>
          <span style={{ color: timerColor, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', fontWeight: isAnswered ? 'normal' : '500' }}>
            {timerStr}
          </span>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Q{questionNum}/{SPRINT_LENGTH}
          </div>
        </div>
      </div>

      {/* Domain header */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', minWidth: 0 }}>
        {sprintMode !== 'adaptive' && (
          <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '10px', backgroundColor: sprintMode === 'math' ? 'rgba(0,212,255,0.1)' : 'rgba(255,215,64,0.1)', color: sprintMode === 'math' ? 'var(--primary)' : 'var(--xp-gold)', border: `1px solid ${sprintMode === 'math' ? 'rgba(0,212,255,0.3)' : 'rgba(255,215,64,0.3)'}`, textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
            {sprintMode}
          </span>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{question.domain}</span>
        <span style={{ color: 'var(--border)', flexShrink: 0 }}>|</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>{question.difficulty}</span>
        {!isAnswered && questionNum === 1 && (
          <button onClick={() => { setSprintMode(null); setSprintModeState(null); sessionStorage.removeItem('lastSprintMode'); setSprintId(null); setQuestion(null); setLoading(false); sprintStartRef.current = null; }}
            style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
            title="Change sprint mode">
            <ChevronLeft size={11} style={{ verticalAlign: 'middle' }} /> mode
          </button>
        )}
        {!isAnswered && questionNum > 1 && <span style={{ marginLeft: 'auto' }} />}
      </div>

      {/* Question content */}
      <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 && question.passage_text ? 'column' : 'row', gap: '24px', marginBottom: '40px' }}>
        {question.passage_text && (
          <div style={{ flex: 1, borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border)' : 'none', paddingRight: window.innerWidth < 768 ? '0' : '32px', paddingBottom: window.innerWidth < 768 ? '16px' : '0', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            <MathText>{question.passage_text}</MathText>
          </div>
        )}
        <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.1rem', lineHeight: 1.65, overflowX: 'auto', minWidth: 0 }}>
          <MathText>{question.question_text}</MathText>
        </div>
      </div>

      {/* Hints */}
      {hintsUsed > 0 && (
        <div style={{ backgroundColor: 'rgba(255,215,64,0.06)', border: '1px solid rgba(255,215,64,0.25)', padding: '16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <AlertCircle color="var(--xp-gold)" style={{ flexShrink: 0, marginTop: '2px' }} size={18} />
          <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            {hintsUsed >= 1 && question.hint_1 && (
              <><div style={{ fontWeight: '600', color: 'var(--xp-gold)', marginBottom: '4px' }}>Hint 1</div><div style={{ marginBottom: hintsUsed >= 2 ? '12px' : 0 }}><MathText>{question.hint_1}</MathText></div></>
            )}
            {hintsUsed >= 2 && question.hint_2 && (
              <><div style={{ fontWeight: '600', color: 'var(--xp-gold)', marginBottom: '4px' }}>Hint 2</div><div><MathText>{question.hint_2}</MathText></div></>
            )}
          </div>
        </div>
      )}

      {/* Answer choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {question.is_grid_in ? (
          <input type="number" value={selectedChoice || ''} onChange={e => setSelectedChoice(e.target.value)}
            disabled={isAnswered} autoFocus
            style={{ padding: '16px', fontSize: '1.2rem', borderRadius: '10px', border: '2px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'white', maxWidth: '260px', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            placeholder="Enter your answer" />
        ) : (
          question.choices.map((c, idx) => {
            let bgColor = 'var(--bg-card)', borderColor = 'var(--border)', textColor = 'var(--text-primary)';
            if (isAnswered) {
              if (c.is_correct) { bgColor = 'rgba(0,230,118,0.08)'; borderColor = 'var(--success)'; }
              else if (selectedChoice === c.label) { bgColor = 'rgba(255,82,82,0.08)'; borderColor = 'var(--error)'; }
            } else if (selectedChoice === c.label) {
              borderColor = 'var(--primary)'; bgColor = 'rgba(0,212,255,0.07)'; textColor = 'var(--primary)';
            }
            return (
              <button key={c.label} disabled={isAnswered} onClick={() => setSelectedChoice(c.label)}
                style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, textAlign: 'left', fontSize: '1rem', gap: '14px', borderRadius: '12px', transition: 'all 0.15s', color: textColor }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: selectedChoice === c.label && !isAnswered ? 'var(--primary)' : 'var(--border)', color: selectedChoice === c.label && !isAnswered ? 'var(--primary-contrast)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>
                  {c.label}
                </div>
                <MathText style={{ flex: 1, color: 'var(--text-primary)' }}>{c.text}</MathText>
                {isAnswered && c.is_correct && <CheckCircle2 size={18} color="var(--success)" />}
                {isAnswered && selectedChoice === c.label && !c.is_correct && <XCircle size={18} color="var(--error)" />}
              </button>
            );
          })
        )}
      </div>

      {/* Post-answer panel */}
      {isAnswered ? (
        <div>
          {question.explanation && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '14px', borderLeft: `4px solid ${isCorrect ? 'var(--success)' : 'var(--primary)'}` }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: isCorrect ? 'var(--success)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isCorrect ? 'Correct!' : 'Explanation'}
                {isCorrect && (
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--xp-gold)', backgroundColor: 'rgba(255,215,64,0.12)', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                    +{DIFF_XP[question?.difficulty] || 20} XP
                  </span>
                )}
              </h3>
              <p style={{ lineHeight: 1.65, color: 'var(--text-primary)', fontSize: '0.95rem' }}><MathText>{question.explanation}</MathText></p>
            </div>
          )}

          {!isCorrect && (
            <div style={{ marginBottom: '14px' }}>
              {!showDeepDive ? (
                <button onClick={handleDeepDive}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderColor: 'rgba(0,212,255,0.4)', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  <Zap size={15} /> Deep Dive with AI
                </button>
              ) : (
                <div style={{ backgroundColor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '0.85rem', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Zap size={14} /> {deepDiveLoading ? 'Generating breakdown...' : 'AI Breakdown'}
                  </h3>
                  <p style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {deepDiveText || (deepDiveLoading ? '...' : '')}
                  </p>
                </div>
              )}
            </div>
          )}

          <button className="primary animate-pop" onClick={handleNext}
            style={{ width: '100%', padding: '15px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {questionNum < SPRINT_LENGTH ? 'Next Question' : 'Complete Sprint'} <ChevronRight size={18} />
          </button>
          <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Press Enter to continue</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isTestMode && (
            <button onClick={() => setHintsUsed(h => Math.min(h + 1, 2))} disabled={hintsUsed >= 2}
              style={{ flex: 1, padding: '13px', fontSize: '0.9rem', color: hintsUsed >= 2 ? 'var(--text-secondary)' : 'var(--xp-gold)', borderColor: hintsUsed >= 2 ? 'var(--border)' : 'rgba(255,215,64,0.3)' }}>
              Hint ({2 - hintsUsed} left)
            </button>
          )}
          <button className="primary" onClick={() => handleAnswerSubmit()}
            disabled={!selectedChoice}
            style={{ flex: 2, padding: '13px', fontSize: '1rem' }}>
            Check Answer
          </button>
        </div>
      )}
      {!isAnswered && !question.is_grid_in && (
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          1-4 to select · Enter to check{!isTestMode ? ' · H for hint' : ''}
        </p>
      )}
    </div>
  );
}
