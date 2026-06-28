import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, BookOpen, TrendingUp, TrendingDown, Minus, Target, Calendar } from 'lucide-react';

const DOMAINS = [
  { name: 'Algebra', section: 'Math' },
  { name: 'Advanced Math', section: 'Math' },
  { name: 'Problem Solving & Data Analysis', section: 'Math' },
  { name: 'Geometry & Trig', section: 'Math' },
  { name: 'Information & Ideas', section: 'English' },
  { name: 'Craft & Structure', section: 'English' },
  { name: 'Expression of Ideas', section: 'English' },
  { name: 'Standard English Conventions', section: 'English' },
];

function DomainCard({ name, stats }) {
  const acc = stats?.accuracy;
  const prior = stats?.priorAccuracy;
  const color = acc === null ? '#2a2a46' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
  const trend = acc !== null && prior !== null ? (acc > prior + 0.02 ? 'up' : acc < prior - 0.02 ? 'down' : 'flat') : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: `1px solid ${acc !== null ? color + '40' : '#2a2a46'}`, transition: 'border-color 0.3s' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.3, minHeight: '32px' }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: acc === null ? '#3a3a56' : color }}>
          {acc === null ? '--' : `${Math.round(acc * 100)}%`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          {trend === 'up' && <TrendingUp size={14} color="var(--success)" />}
          {trend === 'down' && <TrendingDown size={14} color="var(--error)" />}
          {trend === 'flat' && <Minus size={14} color="var(--text-secondary)" />}
          {stats?.count > 0 && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{stats.count}q</div>}
        </div>
      </div>
    </div>
  );
}

function StudyPlanWidget({ user, navigate }) {
  const [plan, setPlan] = useState(null);
  const [editing, setEditing] = useState(false);
  const [targetScore, setTargetScore] = useState(1400);
  const [testDate, setTestDate] = useState('');

  useEffect(() => {
    fetch(`/api/study-plan/${user.id}`)
      .then(r => r.json())
      .then(data => { if (data) { setPlan(data); setTargetScore(data.target_score); setTestDate(data.test_date); } })
      .catch(() => {});
  }, [user.id]);

  const save = async () => {
    if (!testDate) return;
    const res = await fetch(`/api/study-plan/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_score: targetScore, test_date: testDate })
    });
    setPlan(await res.json());
    setEditing(false);
  };

  if (editing || !plan) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid #2a2a46', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Target size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1rem' }}>Set Your Study Plan</h2>
          {editing && <button onClick={() => setEditing(false)} style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cancel</button>}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Target Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="range" min={800} max={1600} step={10} value={targetScore} onChange={e => setTargetScore(Number(e.target.value))}
                style={{ width: '160px', accentColor: 'var(--primary)' }} />
              <span style={{ fontWeight: 'bold', color: 'var(--primary)', minWidth: '40px' }}>{targetScore}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Test Date</div>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
              style={{ padding: '8px 12px', backgroundColor: 'var(--bg-main)', border: '1px solid #2a2a46', borderRadius: '8px', color: 'white', fontSize: '0.9rem', colorScheme: 'dark' }} />
          </div>
          <button className="primary" onClick={save} disabled={!testDate}
            style={{ padding: '8px 20px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            Save Plan
          </button>
        </div>
      </div>
    );
  }

  // Compute plan stats
  const daysLeft = Math.max(0, Math.round((new Date(plan.test_date) - Date.now()) / 86400000));
  const currentTotal = (user.baseline_english || 0) + (user.baseline_math || 0);
  const gap = Math.max(0, plan.target_score - currentTotal);
  const sprintsPerDay = daysLeft > 0 ? Math.ceil(gap / (daysLeft * 50)) : 0;
  const pct = currentTotal >= plan.target_score ? 100 : Math.round((currentTotal / plan.target_score) * 100);

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '22px 28px', borderRadius: '16px', border: '1px solid #2a2a46', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Target size={18} color="var(--primary)" />
        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Study Plan</span>
        <button onClick={() => setEditing(true)} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '3px 8px' }}>Edit</button>
      </div>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Target</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>{plan.target_score}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Days Left</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: daysLeft < 14 ? 'var(--error)' : daysLeft < 30 ? 'var(--xp-gold)' : 'var(--success)' }}>{daysLeft}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Gap</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: gap === 0 ? 'var(--success)' : 'var(--xp-gold)' }}>{gap > 0 ? `+${gap}` : 'At target'}</div>
        </div>
        {daysLeft > 0 && gap > 0 && (
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Sprints/Day</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sprintsPerDay}</div>
          </div>
        )}
      </div>
      <div style={{ height: '5px', backgroundColor: '#0f0f1a', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
        {currentTotal} / {plan.target_score} (baseline) -- {daysLeft > 0 ? `test on ${new Date(plan.test_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}` : 'Test date passed'}
      </div>
    </div>
  );
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setProgress(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/review/count?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setReviewCount(data.count || 0))
      .catch(() => {});
  }, [user.id]);

  const greetingName = user.display_name && user.display_name !== 'Learner' ? user.display_name : null;

  return (
    <div style={{ padding: '48px', maxWidth: '920px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>
        {greetingName ? `Welcome back, ${greetingName}!` : 'Ready to train?'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '0.95rem' }}>
        {loading
          ? 'Loading your progress...'
          : progress?.totalAnswered === 0
          ? 'Start your first sprint to see progress here.'
          : `${progress.totalAnswered} questions answered total.`
        }
      </p>

      {/* Study plan */}
      <StudyPlanWidget user={user} navigate={navigate} />

      {/* CTA row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div onClick={() => navigate('/sprint')}
          style={{ backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a46', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a46'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <PlayCircle size={30} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem' }}>Start Sprint</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
            10 adaptive questions targeting your weakest domains.
          </p>
          <button className="primary" style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}>Let's Go!</button>
        </div>

        <div onClick={() => reviewCount > 0 && navigate('/review')}
          style={{ backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a46', opacity: reviewCount > 0 ? 1 : 0.5, cursor: reviewCount > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}
          onMouseOver={e => { if (reviewCount > 0) { e.currentTarget.style.borderColor = 'var(--xp-gold)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a46'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen size={30} color="var(--xp-gold)" />
            <h2 style={{ fontSize: '1.2rem' }}>Review Errors</h2>
            {reviewCount > 0 && (
              <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,215,64,0.15)', color: 'var(--xp-gold)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: '600', border: '1px solid rgba(255,215,64,0.3)' }}>
                {reviewCount} queued
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
            {reviewCount > 0
              ? `Revisit ${reviewCount} question${reviewCount !== 1 ? 's' : ''} you answered wrong. +25 XP for each mastered.`
              : 'Answer some questions incorrectly and they will appear here for spaced review.'}
          </p>
          <button disabled={reviewCount === 0} onClick={e => { e.stopPropagation(); if (reviewCount > 0) navigate('/review'); }}
            style={{ width: '100%', padding: '10px', fontSize: '0.95rem', backgroundColor: reviewCount > 0 ? 'rgba(255,215,64,0.1)' : undefined, color: reviewCount > 0 ? 'var(--xp-gold)' : undefined, borderColor: reviewCount > 0 ? 'rgba(255,215,64,0.4)' : undefined }}>
            {reviewCount > 0 ? 'Review Now' : 'No errors yet'}
          </button>
        </div>
      </div>

      {/* Predicted score */}
      {progress?.predictedScore && (
        <div style={{ backgroundColor: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '16px', padding: '20px 28px', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <TrendingUp size={28} color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Predicted Score Range</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{progress.predictedScore.range}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>R&amp;W {progress.predictedScore.english}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Math {progress.predictedScore.math}</div>
            {progress.baseline?.english ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Baseline: {progress.baseline.english + progress.baseline.math}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Domain grid */}
      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Domain Performance</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '40px' }}>
        {DOMAINS.map(d => (
          <DomainCard key={d.name} name={d.name} stats={progress?.domainStats?.[d.name]} />
        ))}
      </div>

      {/* Sprint history */}
      {progress?.recentSprints?.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Recent Sprints</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {progress.recentSprints.map(s => {
              const pct = s.questions_attempted > 0 ? Math.round(s.questions_correct / s.questions_attempted * 100) : 0;
              return (
                <div key={s.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '12px 20px', display: 'flex', alignItems: 'center', border: '1px solid #2a2a46' }}>
                  <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.questions_attempted} Qs</span>
                    <span style={{ color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--xp-gold)' : 'var(--error)', fontWeight: '600' }}>{pct}%</span>
                    <span style={{ color: 'var(--xp-gold)' }}>+{s.xp_earned} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && progress?.totalAnswered === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
          <p>Domain stats appear after you answer questions in a sprint.</p>
        </div>
      )}
    </div>
  );
}
