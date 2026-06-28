import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setProgress(data); setLoading(false); })
      .catch(() => setLoading(false));
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

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a46', opacity: 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen size={30} color="var(--xp-gold)" />
            <h2 style={{ fontSize: '1.2rem' }}>Review Errors</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
            Spaced repetition review coming in Phase 2.
          </p>
          <button disabled style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}>Coming Soon</button>
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
