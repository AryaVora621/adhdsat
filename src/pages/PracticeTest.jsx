import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, FileText, Coffee, Trophy, AlertCircle, RotateCcw, BookOpen } from 'lucide-react';
import MathText from '../components/MathText';

// Official digital SAT modules. We run one module per section (a faithful,
// time-boxed simulation that stays manageable for an ADHD attention span);
// each module mirrors the real per-module length and timing.
const MODULES = [
  { section: 'english', label: 'Reading and Writing', count: 27, seconds: 32 * 60 },
  { section: 'math', label: 'Math', count: 22, seconds: 35 * 60 },
];

// Difficulty weights for a difficulty-aware scaled score (200-800 per section).
const DIFF_WEIGHT = { easy: 1, medium: 1.25, hard: 1.6 };

function scaleSection(answers) {
  let earned = 0, possible = 0;
  for (const a of answers) {
    const w = DIFF_WEIGHT[a.difficulty] || 1;
    possible += w;
    if (a.correct) earned += w;
  }
  const ratio = possible ? earned / possible : 0;
  return Math.max(200, Math.min(800, Math.round((200 + ratio * 600) / 10) * 10));
}

function isAnswerCorrect(q, value) {
  if (value === null || value === undefined || value === '') return false;
  if (q.is_grid_in) return parseFloat(value) === q.grid_in_answer;
  return !!q.choices?.find(c => c.label === value)?.is_correct;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Post-test review of a single question: shows the student's answer, the correct
// answer, and the explanation, so the test becomes a learning tool.
function ReviewCard({ item }) {
  const { q, selected, correct } = item;
  const correctChoice = q.choices?.find(c => c.is_correct);
  const borderColor = correct ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.35)';
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '16px 18px', textAlign: 'left', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{q.domain} &middot; {q.difficulty}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: correct ? 'var(--success)' : 'var(--error)' }}>{correct ? 'Correct' : 'Incorrect'}</span>
      </div>
      {q.passage_text && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px', paddingLeft: '10px', borderLeft: '2px solid #2a2a46' }}>
          <MathText>{q.passage_text}</MathText>
        </div>
      )}
      <div style={{ fontSize: '0.95rem', lineHeight: 1.45, marginBottom: '12px' }}><MathText>{q.question_text}</MathText></div>
      {q.is_grid_in ? (
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', marginBottom: '10px' }}>
          <span style={{ color: correct ? 'var(--success)' : 'var(--error)' }}>Your answer: {selected || 'blank'}</span>
          {!correct && <span style={{ color: 'var(--success)' }}>Correct: {q.grid_in_answer}</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {q.choices?.map(c => {
            const isCorrect = c.is_correct;
            const isPicked = selected === c.label;
            const bg = isCorrect ? 'rgba(0,230,118,0.1)' : isPicked ? 'rgba(255,82,82,0.1)' : 'transparent';
            const bd = isCorrect ? 'var(--success)' : isPicked ? 'var(--error)' : '#2a2a46';
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: '8px', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 700, color: bd === '#2a2a46' ? 'var(--text-secondary)' : bd }}>{c.label}</span>
                <span style={{ flex: 1 }}><MathText>{c.text}</MathText></span>
                {isCorrect && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>ANSWER</span>}
                {isPicked && !isCorrect && <span style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 700 }}>YOURS</span>}
              </div>
            );
          })}
          {selected == null && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>You left this blank.</div>}
        </div>
      )}
      {q.explanation && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, backgroundColor: 'rgba(0,212,255,0.04)', borderRadius: '8px', padding: '10px 12px' }}>
          <MathText>{q.explanation}</MathText>
        </div>
      )}
    </div>
  );
}

export default function PracticeTest({ user }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('intro'); // intro | module | break | results | error
  const [moduleIndex, setModuleIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({}); // questionId -> {selected, correct, difficulty, section, domain}
  const [timeLeft, setTimeLeft] = useState(0);
  const [sectionResults, setSectionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [prevBest, setPrevBest] = useState(null);
  const [reviewItems, setReviewItems] = useState([]); // every answered question, for post-test review
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('missed'); // missed | all

  const timerRef = useRef(null);
  const answersRef = useRef({});
  answersRef.current = answers;
  const savedRef = useRef(false);

  const loadHistory = useCallback(() => {
    fetch(`/api/practice-test/history/${user.id}`)
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setHistory(d.results || []))
      .catch(() => {});
  }, [user.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Persist the completed test once, then refresh the trend.
  useEffect(() => {
    if (phase !== 'results' || savedRef.current || sectionResults.length < 2) return;
    savedRef.current = true;
    // Snapshot the best score from BEFORE this attempt (history is still pre-save here).
    setPrevBest(history.length ? Math.max(...history.map(h => h.total_score)) : 0);
    const rw = sectionResults.find(r => r.section === 'english');
    const math = sectionResults.find(r => r.section === 'math');
    fetch('/api/practice-test/result', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        rw_score: rw?.scaled, math_score: math?.scaled,
        rw_correct: rw?.correct, rw_total: rw?.total,
        math_correct: math?.correct, math_total: math?.total,
      }),
    }).then(() => loadHistory()).catch(() => {});
  }, [phase, sectionResults, user.id, loadHistory]);

  const loadModule = useCallback(async (idx) => {
    const mod = MODULES[idx];
    setLoading(true);
    try {
      const res = await fetch(`/api/practice-test?section=${mod.section}&count=${mod.count}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data.questions?.length) throw new Error('no questions');
      setQuestions(data.questions);
      setQIndex(0);
      setSelected(null);
      setTimeLeft(mod.seconds);
      setModuleIndex(idx);
      setPhase('module');
    } catch {
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // finishModule is defined before the timer effect that depends on it.
  const finishModule = useCallback(() => {
    clearInterval(timerRef.current);
    const mod = MODULES[moduleIndex];
    const modAnswers = questions.map(q => {
      const a = answersRef.current[q.id];
      return { correct: !!a?.correct, difficulty: q.difficulty, domain: q.domain };
    });
    const scaled = scaleSection(modAnswers);
    const correct = modAnswers.filter(a => a.correct).length;
    setSectionResults(prev => [...prev, { section: mod.section, label: mod.label, scaled, correct, total: questions.length }]);
    // Keep each question with the student's response for the post-test review.
    setReviewItems(prev => [...prev, ...questions.map(q => {
      const a = answersRef.current[q.id];
      return { q, selected: a?.selected ?? null, correct: !!a?.correct, sectionLabel: mod.label };
    })]);
    if (moduleIndex < MODULES.length - 1) {
      setPhase('break');
    } else {
      setPhase('results');
    }
  }, [moduleIndex, questions]);

  // Countdown timer for the active module.
  useEffect(() => {
    if (phase !== 'module') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finishModule();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, moduleIndex, finishModule]);

  const recordAndAdvance = () => {
    const q = questions[qIndex];
    const correct = isAnswerCorrect(q, selected);
    setAnswers(prev => ({ ...prev, [q.id]: { selected, correct, difficulty: q.difficulty, domain: q.domain } }));
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
      setSelected(null);
    } else {
      finishModule();
    }
  };

  // Keyboard: 1-4 to pick a choice, Enter to advance.
  useEffect(() => {
    if (phase !== 'module') return;
    const q = questions[qIndex];
    const onKey = (e) => {
      if (!q) return;
      if (!q.is_grid_in && ['1', '2', '3', '4'].includes(e.key)) {
        const c = q.choices[parseInt(e.key, 10) - 1];
        if (c) setSelected(c.label);
      } else if (e.key === 'Enter') {
        recordAndAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bind each render so it sees latest selected/qIndex

  const wrap = { padding: 'clamp(16px, 5vw, 48px)', maxWidth: '720px', margin: '0 auto', width: '100%' };

  // ---- INTRO ----
  if (phase === 'intro') {
    return (
      <div style={wrap}>
        <FileText size={40} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px' }}>Full Practice Test</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          A timed, two-section simulation modeled on the official Digital SAT. Work straight
          through each module under real time pressure, then get a scaled 400&ndash;1600 estimate.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {MODULES.map((m, i) => (
            <div key={m.section} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid #2a2a46' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(0,212,255,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{m.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.count} questions &middot; {m.seconds / 60} minutes</div>
              </div>
            </div>
          ))}
        </div>
        {history.length > 0 && (() => {
          const best = Math.max(...history.map(h => h.total_score));
          const recent = history.slice(0, 6).reverse(); // oldest -> newest for a left-to-right trend
          const max = Math.max(...recent.map(h => h.total_score), 1);
          return (
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid #2a2a46', padding: '16px 18px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Your Scores</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Best <strong style={{ color: 'var(--xp-gold)' }}>{best}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '64px' }}>
                {recent.map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{h.total_score}</div>
                    <div style={{ width: '100%', maxWidth: '34px', height: `${Math.max(8, (h.total_score / max) * 44)}px`, backgroundColor: h.total_score === best ? 'var(--xp-gold)' : 'var(--primary)', borderRadius: '4px 4px 0 0' }} />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          No hints or explanations during the test, just like the real thing. There is a short break between sections.
        </p>
        <button className="primary" disabled={loading} onClick={() => loadModule(0)}
          style={{ width: '100%', padding: '15px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          {loading ? 'Loading...' : 'Start Practice Test'} <ChevronRight size={18} />
        </button>
        <button onClick={() => navigate('/')} style={{ width: '100%', marginTop: '10px', padding: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ---- ERROR ----
  if (phase === 'error') {
    return (
      <div style={{ ...wrap, textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--xp-gold)" style={{ marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '8px' }}>Could not start the test</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Check your connection and try again.</p>
        <button className="primary" onClick={() => setPhase('intro')} style={{ padding: '12px 28px' }}>Back</button>
      </div>
    );
  }

  // ---- BREAK ----
  if (phase === 'break') {
    const done = sectionResults[sectionResults.length - 1];
    return (
      <div style={{ ...wrap, textAlign: 'center' }}>
        <Coffee size={40} color="var(--xp-gold)" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '8px' }}>Section Break</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          {done?.label} complete. Take a breath, stretch, hydrate. When you are ready, continue to the {MODULES[moduleIndex + 1]?.label} section.
        </p>
        <button className="primary" disabled={loading} onClick={() => loadModule(moduleIndex + 1)}
          style={{ padding: '14px 32px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {loading ? 'Loading...' : `Continue to ${MODULES[moduleIndex + 1]?.label}`} <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ---- RESULTS ----
  if (phase === 'results') {
    const total = sectionResults.reduce((s, r) => s + r.scaled, 0);
    return (
      <div style={{ ...wrap, textAlign: 'center' }}>
        <Trophy size={44} color="var(--xp-gold)" style={{ marginBottom: '12px' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>Practice Test Complete</h1>
        {prevBest > 0 && total > prevBest && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,215,64,0.12)', border: '1px solid rgba(255,215,64,0.35)', borderRadius: '20px', padding: '5px 14px', margin: '6px 0', color: 'var(--xp-gold)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Trophy size={15} /> New Personal Best! (+{total - prevBest})
          </div>
        )}
        <div style={{ fontSize: '3.4rem', fontWeight: 800, color: 'var(--primary)', margin: '8px 0' }}>{total}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '24px' }}>ESTIMATED SCORE (400&ndash;1600)</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {sectionResults.map(r => (
            <div key={r.section} style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid #2a2a46', padding: '18px 12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{r.scaled}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{r.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{r.correct}/{r.total} correct</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
          This is a difficulty-weighted estimate from a single module per section, not an official score. Use it to track progress over time.
        </p>
        {(() => {
          const missed = reviewItems.filter(it => !it.correct).length;
          return (
            <button onClick={() => setShowReview(s => !s)}
              style={{ width: '100%', padding: '13px', marginBottom: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid #2a2a46', borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="var(--primary)" />
              {showReview ? 'Hide answer review' : `Review your answers (${missed} missed)`}
            </button>
          );
        })()}
        {showReview && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
              {['missed', 'all'].map(f => (
                <button key={f} onClick={() => setReviewFilter(f)}
                  style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${reviewFilter === f ? 'var(--primary)' : '#2a2a46'}`, backgroundColor: reviewFilter === f ? 'rgba(0,212,255,0.1)' : 'transparent', color: reviewFilter === f ? 'var(--primary)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {f === 'missed' ? 'Missed only' : 'All questions'}
                </button>
              ))}
            </div>
            {reviewItems
              .filter(it => reviewFilter === 'all' || !it.correct)
              .map((it, i) => <ReviewCard key={i} item={it} />)}
            {reviewFilter === 'missed' && reviewItems.every(it => it.correct) && (
              <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>Perfect run -- nothing missed. Switch to "All questions" to review everything.</p>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="primary" onClick={() => { savedRef.current = false; setShowReview(false); setReviewItems([]); setSectionResults([]); setAnswers({}); setPhase('intro'); }}
            style={{ padding: '13px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={16} /> Retake
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '13px 20px', color: 'var(--text-secondary)' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ---- MODULE (taking the test) ----
  const mod = MODULES[moduleIndex];
  const q = questions[qIndex];
  if (loading || !q) {
    return <div style={{ ...wrap, color: 'var(--text-secondary)' }}>Loading questions...</div>;
  }
  const timerColor = timeLeft < 120 ? 'var(--error)' : timeLeft < 300 ? 'var(--xp-gold)' : 'var(--text-secondary)';

  return (
    <div style={wrap}>
      {/* Header: section, progress, timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          {mod.label} &middot; Question {qIndex + 1} of {questions.length}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timerColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          <Clock size={15} /> {fmtTime(timeLeft)}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '24px' }}>
        {questions.map((qq, i) => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: i < qIndex ? 'var(--primary)' : i === qIndex ? 'rgba(0,212,255,0.4)' : '#2a2a46' }} />
        ))}
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        {q.domain} &middot; {q.difficulty}
      </div>
      {q.passage_text && (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', marginBottom: '16px', lineHeight: 1.6, fontSize: '0.95rem' }}>
          <MathText>{q.passage_text}</MathText>
        </div>
      )}
      <div style={{ fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '24px' }}>
        <MathText>{q.question_text}</MathText>
      </div>

      {/* Answers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {q.is_grid_in ? (
          <input type="number" value={selected || ''} onChange={e => setSelected(e.target.value)} autoFocus
            placeholder="Enter your answer"
            style={{ padding: '16px', fontSize: '1.2rem', borderRadius: '10px', border: '2px solid #2a2a46', backgroundColor: 'var(--bg-main)', color: 'white', maxWidth: '260px', outline: 'none' }} />
        ) : (
          q.choices.map(c => {
            const active = selected === c.label;
            return (
              <button key={c.label} onClick={() => setSelected(c.label)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', backgroundColor: active ? 'rgba(0,212,255,0.07)' : 'var(--bg-card)', border: `2px solid ${active ? 'var(--primary)' : '#2a2a46'}`, borderRadius: '12px', textAlign: 'left', fontSize: '1rem', color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: active ? 'var(--primary)' : '#2a2a46', color: active ? '#000' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>{c.label}</div>
                <MathText style={{ flex: 1 }}>{c.text}</MathText>
              </button>
            );
          })
        )}
      </div>

      <button className="primary" onClick={recordAndAdvance}
        style={{ width: '100%', padding: '15px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        {qIndex < questions.length - 1 ? 'Next' : 'Finish Section'} <ChevronRight size={18} />
      </button>
      <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        {q.is_grid_in ? 'Type your answer · Enter to continue' : '1-4 to select · Enter to continue'} · You can leave a question blank
      </p>
    </div>
  );
}
