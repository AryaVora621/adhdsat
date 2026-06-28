import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, Zap, BookOpen } from 'lucide-react';
import MathText from '../components/MathText';

const REVIEW_LENGTH = 5;

export default function ReviewSprint({ user, setUser }) {
  const [sprintId, setSprintId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionNum, setQuestionNum] = useState(1);
  const [stats, setStats] = useState({ attempted: 0, correct: 0, xp: 0 });
  const [noErrors, setNoErrors] = useState(false);

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [deepDiveText, setDeepDiveText] = useState('');
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [sm2Result, setSm2Result] = useState(null);

  const timeStartRef = useRef(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    const startReview = async () => {
      try {
        const res = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, sprint_type: 'review' })
        });
        const data = await res.json();
        setSprintId(data.id);
        await fetchNextQuestion();
      } catch {
        setLoading(false);
      }
    };
    startReview();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setSelectedChoice(null);
    setIsAnswered(false);
    setHintsUsed(0);
    setDeepDiveText('');
    setShowDeepDive(false);
    setSm2Result(null);
    timeStartRef.current = Date.now();
    try {
      const res = await fetch(`/api/review/next?userId=${user.id}`);
      if (!res.ok) throw new Error('fetch failed');
      const q = await res.json();
      if (!q) {
        setNoErrors(true);
        setLoading(false);
        return;
      }
      setQuestion(q);
    } catch {
      setNoErrors(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = useCallback(async () => {
    if (!selectedChoice && question?.is_grid_in === 0) return;
    if (isAnswered) return;
    let correct = false;
    if (question.is_grid_in) {
      correct = parseFloat(selectedChoice) === question.grid_in_answer;
    } else {
      const choice = question.choices.find(c => c.label === selectedChoice);
      if (choice?.is_correct) correct = true;
    }
    const timeSpent = Math.round((Date.now() - timeStartRef.current) / 1000);
    const xpGained = correct ? 25 : 5; // Bonus XP for getting review right
    setIsAnswered(true);
    setStats(prev => ({ attempted: prev.attempted + 1, correct: prev.correct + (correct ? 1 : 0), xp: prev.xp + xpGained }));
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          question_id: question.id,
          selected_choice: selectedChoice,
          is_correct: correct ? 1 : 0,
          hints_used: hintsUsed,
          time_spent_seconds: timeSpent,
          sprint_id: sprintId
        })
      });
      // Update SM-2 card scheduling
      const sm2Res = await fetch('/api/review/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, questionId: question.id, isCorrect: correct })
      });
      const sm2Data = await sm2Res.json();
      if (sm2Data.interval_days !== undefined) {
        setSm2Result({ interval_days: sm2Data.interval_days, next_review_at: sm2Data.next_review_at });
      }
      const userRes = await fetch(`/api/users/${user.id}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp_gained: xpGained })
      });
      setUser(await userRes.json());
    } catch {}
  }, [selectedChoice, question, isAnswered, hintsUsed, sprintId, user.id]);

  const handleNextCb = useCallback(async () => {
    if (questionNum >= REVIEW_LENGTH) {
      try {
        await fetch(`/api/sprints/${sprintId}/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions_attempted: stats.attempted, questions_correct: stats.correct, xp_earned: stats.xp })
        });
      } catch {}
      navigate('/');
    } else {
      setQuestionNum(n => n + 1);
      await fetchNextQuestion();
    }
  }, [questionNum, sprintId, stats, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!question || loading || noErrors) return;
      if (e.target.tagName === 'INPUT') return;
      if (!isAnswered) {
        if (['1','2','3','4'].includes(e.key) && !question.is_grid_in) {
          const label = ['A','B','C','D'][parseInt(e.key) - 1];
          if (label && question.choices.find(c => c.label === label)) setSelectedChoice(label);
        }
        if (e.key === 'Enter') handleAnswerSubmit();
        if (e.key === 'h' || e.key === 'H') { if (hintsUsed < 2) setHintsUsed(h => h + 1); }
      } else {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextCb(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, isAnswered, loading, noErrors, hintsUsed, handleAnswerSubmit, handleNextCb]);

  const handleDeepDive = async () => {
    setDeepDiveLoading(true);
    setShowDeepDive(true);
    setDeepDiveText('');
    try {
      const correctAnswer = question.choices.find(c => c.is_correct)?.text || question.grid_in_answer?.toString() || 'Unknown';
      const selectedText = question.choices.find(c => c.label === selectedChoice)?.text || selectedChoice;
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: question.question_text, selectedChoice: `${selectedChoice}: ${selectedText}`, correctAnswer })
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
          try { const p = JSON.parse(data); if (p.text) setDeepDiveText(prev => prev + p.text); } catch {}
        }
      }
    } catch {
      setDeepDiveText('Could not load deep dive explanation.');
    } finally {
      setDeepDiveLoading(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading review question {questionNum}...
      </div>
    );
  }

  if (noErrors || !question) {
    return (
      <div style={{ padding: '48px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <BookOpen size={48} color="var(--xp-gold)" style={{ marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '12px' }}>No errors to review!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
          You haven't answered any questions incorrectly yet, or you've already mastered your previous mistakes. Keep practicing with sprints!
        </p>
        <button className="primary" onClick={() => navigate('/sprint')} style={{ padding: '12px 32px', fontSize: '1rem' }}>
          Start a Sprint
        </button>
      </div>
    );
  }

  const isCorrect = question.is_grid_in
    ? parseFloat(selectedChoice) === question.grid_in_answer
    : question.choices.find(c => c.label === selectedChoice)?.is_correct;

  return (
    <div style={{ padding: '48px', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <BookOpen size={18} color="var(--xp-gold)" />
        <span style={{ color: 'var(--xp-gold)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Review Mode</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: 'auto' }}>Q{questionNum} / {REVIEW_LENGTH}</span>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {Array.from({ length: REVIEW_LENGTH }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '5px', borderRadius: '3px',
            backgroundColor: i < questionNum - 1 ? 'var(--xp-gold)' : i === questionNum - 1 ? 'rgba(255,215,64,0.4)' : '#2a2a46',
            transition: 'background-color 0.3s'
          }} />
        ))}
      </div>

      {/* Domain header */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.section}</span>
        <span style={{ color: '#2a2a46' }}>|</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.domain}</span>
        <span style={{ color: '#2a2a46' }}>|</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{question.difficulty}</span>
        {!isAnswered && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#2a2a46' }}>1-4 to pick, Enter to submit</span>}
      </div>

      {/* Question */}
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
          question.choices.map(c => {
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

      {/* Post-answer */}
      {isAnswered ? (
        <div>
          {question.explanation && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '14px', borderLeft: `4px solid ${isCorrect ? 'var(--success)' : 'var(--primary)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '0.9rem', color: isCorrect ? 'var(--success)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isCorrect ? 'Correct! +25 XP' : 'Explanation'}
                </h3>
                {sm2Result && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', backgroundColor: '#0f0f1a', padding: '3px 8px', borderRadius: '10px', border: '1px solid #2a2a46' }}>
                    {isCorrect
                      ? `Next review in ${sm2Result.interval_days}d`
                      : `Will repeat soon`}
                  </span>
                )}
              </div>
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
          <button className="primary animate-pop" onClick={handleNextCb}
            style={{ width: '100%', padding: '15px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {questionNum < REVIEW_LENGTH ? 'Next Review' : 'Finish Review'} <ChevronRight size={18} />
          </button>
          <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Press Enter to continue</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setHintsUsed(h => Math.min(h + 1, 2))} disabled={hintsUsed >= 2}
            style={{ flex: 1, padding: '13px', fontSize: '0.9rem', color: hintsUsed >= 2 ? 'var(--text-secondary)' : 'var(--xp-gold)', borderColor: hintsUsed >= 2 ? '#2a2a46' : 'rgba(255,215,64,0.3)' }}>
            Hint ({2 - hintsUsed} left)
          </button>
          <button className="primary" onClick={handleAnswerSubmit}
            disabled={!selectedChoice && question.is_grid_in === 0}
            style={{ flex: 2, padding: '13px', fontSize: '1rem' }}>
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}
