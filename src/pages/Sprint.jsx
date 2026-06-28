import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, Zap, Trophy } from 'lucide-react';
import MathText from '../components/MathText';

function SummaryScreen({ finalStats, sprintId, accuracy, grade, SPRINT_LENGTH, navigate, user, setShowSummary, setFinalStats, setStats, setQuestionNum, setQuestion, setLoading, setSprintId, fetchNextQuestion }) {
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    if (!sprintId) return;
    fetch(`/api/sprints/${sprintId}/breakdown`)
      .then(r => r.json())
      .then(setBreakdown)
      .catch(() => {});
  }, [sprintId]);

  const domainColor = (acc) => acc >= 70 ? 'var(--success)' : acc >= 50 ? 'var(--xp-gold)' : 'var(--error)';

  const handleSprintAgain = async () => {
    setShowSummary(false); setFinalStats(null);
    setStats({ attempted: 0, correct: 0, xp: 0 }); setQuestionNum(1);
    setQuestion(null); setLoading(true);
    const res = await fetch('/api/sprints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, sprint_type: 'adaptive' }) });
    const data = await res.json(); setSprintId(data.id);
    fetchNextQuestion();
  };

  return (
    <div style={{ padding: '48px', maxWidth: '600px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
      <Trophy size={48} color="var(--xp-gold)" style={{ marginBottom: '24px' }} />
      <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Sprint Complete!</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{SPRINT_LENGTH} questions finished</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Correct', value: `${finalStats.correct}/${finalStats.attempted}` },
          { label: 'Accuracy', value: `${accuracy}%`, color: grade.color },
          { label: 'XP Earned', value: `+${finalStats.xp}`, color: 'var(--xp-gold)' }
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '14px', border: '1px solid #2a2a46' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', borderRadius: '14px', border: `2px solid ${grade.color}`, marginBottom: '24px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: grade.color }}>{grade.label}</span>
      </div>

      {breakdown?.domains?.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '14px', border: '1px solid #2a2a46', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Domain Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {breakdown.domains.map(d => (
              <div key={d.domain} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.domain}</span>
                <div style={{ width: '80px', height: '4px', backgroundColor: '#2a2a46', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.accuracy}%`, height: '100%', backgroundColor: domainColor(d.accuracy) }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: domainColor(d.accuracy), minWidth: '38px', textAlign: 'right' }}>{d.accuracy}%</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '30px' }}>{d.correct}/{d.total}</span>
              </div>
            ))}
          </div>
          {breakdown.totalTime > 0 && (
            <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid #2a2a46', paddingTop: '10px' }}>
              Total time: {Math.floor(breakdown.totalTime / 60)}m {breakdown.totalTime % 60}s
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => navigate('/review')}
          style={{ flex: 1, padding: '14px', fontSize: '0.9rem', borderColor: 'rgba(255,215,64,0.3)', color: 'var(--xp-gold)' }}>
          Review Errors
        </button>
        <button className="primary" onClick={handleSprintAgain}
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

export default function Sprint({ user, setUser }) {
  const [sprintId, setSprintId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionNum, setQuestionNum] = useState(1);
  const [stats, setStats] = useState({ attempted: 0, correct: 0, xp: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [finalStats, setFinalStats] = useState(null);

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
  const navigate = useNavigate();
  const SPRINT_LENGTH = 10;

  // Start per-question timer
  const startTimer = () => {
    clearInterval(timerRef.current);
    setElapsed(0);
    timeStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timeStartRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => clearInterval(timerRef.current);

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    const startSprint = async () => {
      try {
        const res = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, sprint_type: 'adaptive' })
        });
        const data = await res.json();
        setSprintId(data.id);
        await fetchNextQuestion();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    startSprint();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setSelectedChoice(null);
    setIsAnswered(false);
    setHintsUsed(0);
    setDeepDiveText('');
    setShowDeepDive(false);
    try {
      const res = await fetch(`/api/questions/next?userId=${user.id}`);
      if (!res.ok) throw new Error('No questions');
      const q = await res.json();
      setQuestion(q);
      startTimer();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = useCallback(async (choiceOverride) => {
    const choice = choiceOverride ?? selectedChoice;
    if (!choice && question?.is_grid_in === 0) return;
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

    const xpGained = correct ? 20 : 5;

    setIsAnswered(true);
    setStats(prev => ({
      attempted: prev.attempted + 1,
      correct: prev.correct + (correct ? 1 : 0),
      xp: prev.xp + xpGained
    }));

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
    } catch (err) {
      console.error(err);
    }
  }, [selectedChoice, question, isAnswered, hintsUsed, sprintId, user.id]);

  const handleNext = useCallback(async () => {
    const current = stats;
    if (questionNum >= SPRINT_LENGTH) {
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
      setFinalStats(current);
      setShowSummary(true);
    } else {
      setQuestionNum(n => n + 1);
      await fetchNextQuestion();
    }
  }, [questionNum, sprintId, stats]);

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

  const handleDeepDive = async () => {
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
          correctAnswer
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

    return (
      <SummaryScreen
        finalStats={finalStats}
        sprintId={sprintId}
        accuracy={accuracy}
        grade={grade}
        SPRINT_LENGTH={SPRINT_LENGTH}
        navigate={navigate}
        user={user}
        setShowSummary={setShowSummary}
        setFinalStats={setFinalStats}
        setStats={setStats}
        setQuestionNum={setQuestionNum}
        setQuestion={setQuestion}
        setLoading={setLoading}
        setSprintId={setSprintId}
        fetchNextQuestion={fetchNextQuestion}
      />
    );
  }


  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        Loading question {questionNum}...
      </div>
    );
  }
  if (!question) {
    return (
      <div style={{ padding: '48px' }}>
        <h2 style={{ marginBottom: '12px' }}>No questions available</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Run <code style={{ backgroundColor: '#2a2a46', padding: '2px 6px', borderRadius: '4px' }}>node server/ingest.js</code> to load the question bank.</p>
      </div>
    );
  }

  const isCorrect = question.is_grid_in
    ? parseFloat(selectedChoice) === question.grid_in_answer
    : question.choices.find(c => c.label === selectedChoice)?.is_correct;

  const timerColor = elapsed < 60 ? 'var(--text-secondary)' : elapsed < 120 ? 'var(--xp-gold)' : 'var(--error)';
  const timerStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div style={{ padding: '48px', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Progress bar + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {Array.from({ length: SPRINT_LENGTH }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '5px', borderRadius: '3px',
              backgroundColor: i < questionNum - 1 ? 'var(--primary)' : i === questionNum - 1 ? 'rgba(0,212,255,0.4)' : '#2a2a46',
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
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.section}</span>
        <span style={{ color: '#2a2a46' }}>|</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.domain}</span>
        <span style={{ color: '#2a2a46' }}>|</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.difficulty}</span>
        {!isAnswered && (
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#2a2a46' }}>1-4 to pick, Enter to submit</span>
        )}
      </div>

      {/* Question content */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
        {question.passage_text && (
          <div style={{ flex: 1, borderRight: '1px solid #2a2a46', paddingRight: '32px', fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
            <MathText>{question.passage_text}</MathText>
          </div>
        )}
        <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.1rem', lineHeight: 1.65 }}>
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
            disabled={isAnswered}
            style={{ padding: '16px', fontSize: '1.2rem', borderRadius: '10px', border: '2px solid #2a2a46', backgroundColor: 'var(--bg-main)', color: 'white', maxWidth: '260px', outline: 'none' }}
            placeholder="Enter your answer" />
        ) : (
          question.choices.map((c, idx) => {
            let bgColor = 'var(--bg-card)', borderColor = '#2a2a46', textColor = 'var(--text-primary)';
            if (isAnswered) {
              if (c.is_correct) { bgColor = 'rgba(0,230,118,0.08)'; borderColor = 'var(--success)'; }
              else if (selectedChoice === c.label) { bgColor = 'rgba(255,82,82,0.08)'; borderColor = 'var(--error)'; }
            } else if (selectedChoice === c.label) {
              borderColor = 'var(--primary)'; bgColor = 'rgba(0,212,255,0.07)'; textColor = 'var(--primary)';
            }
            return (
              <button key={c.label} disabled={isAnswered} onClick={() => setSelectedChoice(c.label)}
                style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, textAlign: 'left', fontSize: '1rem', gap: '14px', borderRadius: '12px', transition: 'all 0.15s', color: textColor }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: selectedChoice === c.label && !isAnswered ? 'var(--primary)' : '#2a2a46', color: selectedChoice === c.label && !isAnswered ? '#000' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.85rem' }}>
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
              <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: isCorrect ? 'var(--success)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isCorrect ? 'Correct!' : 'Explanation'}
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
          <button onClick={() => setHintsUsed(h => Math.min(h + 1, 2))} disabled={hintsUsed >= 2}
            style={{ flex: 1, padding: '13px', fontSize: '0.9rem', color: hintsUsed >= 2 ? 'var(--text-secondary)' : 'var(--xp-gold)', borderColor: hintsUsed >= 2 ? '#2a2a46' : 'rgba(255,215,64,0.3)' }}>
            Hint ({2 - hintsUsed} left)
          </button>
          <button className="primary" onClick={() => handleAnswerSubmit()}
            disabled={!selectedChoice && question.is_grid_in === 0}
            style={{ flex: 2, padding: '13px', fontSize: '1rem' }}>
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}
