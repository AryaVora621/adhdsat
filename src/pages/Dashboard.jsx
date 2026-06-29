import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, BookOpen, TrendingUp, TrendingDown, Minus, Target, Calendar, Zap, Calculator, AlertCircle, Shuffle, BarChart2, Flame, FileText } from 'lucide-react';

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
  const acc = stats?.accuracy ?? null;
  const prior = stats?.priorAccuracy ?? null;
  const hasData = acc !== null && stats?.count > 0;
  const color = !hasData ? 'var(--border)' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
  const trend = hasData && prior !== null ? (acc > prior + 0.02 ? 'up' : acc < prior - 0.02 ? 'down' : 'flat') : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: `1px solid ${hasData ? color + '40' : 'var(--border)'}`, transition: 'border-color 0.3s' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.3, minHeight: '28px' }}>{name}</div>
      {hasData ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color }}>{Math.round(acc * 100)}%</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            {trend === 'up' && <TrendingUp size={14} color="var(--success)" />}
            {trend === 'down' && <TrendingDown size={14} color="var(--error)" />}
            {trend === 'flat' && <Minus size={14} color="var(--text-secondary)" />}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{stats.count}q</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No data yet</div>
      )}
    </div>
  );
}

function WeeklyStatsWidget({ user }) {
  const [stats, setStats] = useState({ sprints: 0, xp: 0, minutes: 0 });

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/sprints?userId=${user.id}&days=7`)
      .then(r => r.json())
      .then(data => {
        const sprints = data?.sprints || [];
        const xp = sprints.reduce((sum, s) => sum + (s.xp_earned || 0), 0);
        const minutes = Math.round(sprints.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60);
        setStats({ sprints: sprints.length, xp, minutes });
      })
      .catch(() => {});
  }, [user?.id]);

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      marginBottom: '24px'
    }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', fontWeight: '600' }}>
        This Week
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>{stats.sprints}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sprints</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--xp-gold)' }}>+{stats.xp}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>XP</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)' }}>{stats.minutes}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Minutes</div>
        </div>
      </div>
    </div>
  );
}

function QuickStartCard({ navigate, user }) {
  const [starting, setStarting] = useState(false);
  const [today, setToday] = useState(null);
  const DAILY_GOAL = 3;

  useEffect(() => {
    fetch(`/api/today/${user.id}`)
      .then(r => r.json())
      .then(setToday)
      .catch(() => {});
  }, [user.id]);

  const handleStudyNow = () => {
    // Sprint.jsx creates the sprint record (and enforces the plan gate) on mount;
    // navigating with the mode avoids a duplicate sprint and a double count.
    setStarting(true);
    navigate('/sprint', { state: { mode: 'adaptive' } });
  };

  const done = today?.sprints_today || 0;
  const allDone = done >= DAILY_GOAL;

  // Streak-at-risk: user has a streak but hasn't studied today
  const todayStr = new Date().toISOString().slice(0, 10);
  const streakAtRisk = user.current_streak > 0 && user.last_active_date !== todayStr && done === 0;

  return (
    <div style={{
      backgroundImage: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,230,118,0.08))',
      padding: '28px', borderRadius: '16px', border: '1px solid rgba(0,212,255,0.25)',
      textAlign: 'center', marginBottom: '28px'
    }}>
      {streakAtRisk && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.35)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
          <Flame size={13} color="var(--error)" />
          <span style={{ color: 'var(--error)', fontSize: '0.78rem', fontWeight: '700' }}>{user.current_streak}-day streak at risk -- study now to keep it!</span>
        </div>
      )}
      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
        {allDone ? 'Goal Reached!' : "Let's Go!"}
      </div>
      <button className="primary" onClick={handleStudyNow} disabled={starting}
        style={{ padding: '16px 32px', fontSize: '1.15rem', width: '100%', fontWeight: '700', letterSpacing: '0.5px' }}>
        {starting ? 'Starting...' : allDone ? 'Keep Going' : 'Study Now'}
      </button>
      {today !== null && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            {Array.from({ length: DAILY_GOAL }, (_, i) => (
              <div key={i} style={{
                width: '28px', height: '8px', borderRadius: '4px',
                backgroundColor: i < done ? 'var(--primary)' : 'var(--border)',
                transition: 'background-color 0.3s'
              }} />
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: allDone ? 'var(--success)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
            {allDone ? `${done} sprints today -- daily goal complete!` : `${done}/${DAILY_GOAL} sprints today · Adaptive mode targets your weaknesses`}
          </p>
        </div>
      )}
      {today === null && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.4 }}>
          Jump into an adaptive sprint · We'll focus on your weakest areas
        </p>
      )}
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
    try {
      const res = await fetch(`/api/study-plan/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_score: targetScore, test_date: testDate })
      });
      setPlan(await res.json());
      setEditing(false);
    } catch {}
  };

  if (editing || !plan) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '28px' }}>
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
              style={{ padding: '8px 12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
          </div>
          <button className="primary" onClick={save}
            style={{ padding: '8px 20px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            Save Plan
          </button>
        </div>
      </div>
    );
  }

  // Compute plan stats
  const hasTestDate = !!plan.test_date;
  const daysLeft = hasTestDate ? Math.max(0, Math.round((new Date(plan.test_date) - Date.now()) / 86400000)) : null;
  const currentTotal = (user.baseline_english || 0) + (user.baseline_math || 0);
  const gap = Math.max(0, plan.target_score - currentTotal);
  const sprintsPerDay = daysLeft > 0 ? Math.ceil(gap / (daysLeft * 50)) : 0;
  const pct = currentTotal >= plan.target_score ? 100 : Math.round((currentTotal / plan.target_score) * 100);

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '22px 28px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '28px' }}>
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
        {hasTestDate && (
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Days Left</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: daysLeft < 14 ? 'var(--error)' : daysLeft < 30 ? 'var(--xp-gold)' : 'var(--success)' }}>{daysLeft}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Gap</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: gap === 0 ? 'var(--success)' : 'var(--xp-gold)' }}>{gap > 0 ? `+${gap}` : 'At target'}</div>
        </div>
        {hasTestDate && daysLeft > 0 && gap > 0 && (
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Sprints/Day</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sprintsPerDay}</div>
          </div>
        )}
      </div>
      <div style={{ height: '5px', backgroundColor: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
        {currentTotal} / {plan.target_score} baseline{hasTestDate ? ` · test on ${new Date(plan.test_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}` : ''}
      </div>
    </div>
  );
}

function SprintSparkline({ sprints }) {
  const W = 560, H = 80, PAD = 16;
  const data = [...sprints].reverse().map(s => ({
    pct: s.questions_attempted > 0 ? Math.round(s.questions_correct / s.questions_attempted * 100) : 0,
    xp: s.xp_earned,
    date: new Date(s.completed_at),
    count: s.questions_attempted,
  }));

  const n = data.length;
  const minY = Math.min(...data.map(d => d.pct));
  const maxY = Math.max(...data.map(d => d.pct));
  const yRange = Math.max(maxY - minY, 20);

  const x = (i) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const y = (pct) => H - PAD - ((pct - minY) / yRange) * (H - PAD * 2);

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.pct)}`).join(' ');
  const areaPath = `${linePath} L ${x(n-1)} ${H} L ${x(0)} ${H} Z`;

  const trend = data.length >= 2 ? data[data.length - 1].pct - data[0].pct : 0;
  const trendColor = trend > 5 ? 'var(--success)' : trend < -5 ? 'var(--error)' : 'var(--text-secondary)';
  const trendLabel = trend > 5 ? `+${trend}% improving` : trend < -5 ? `${trend}% declining` : 'holding steady';

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '20px 24px', border: '1px solid var(--border)', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Accuracy Trend</span>
        <span style={{ fontSize: '0.82rem', color: trendColor, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {trend > 5 ? <TrendingUp size={14} /> : trend < -5 ? <TrendingDown size={14} /> : <Minus size={14} />}
          {trendLabel}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Gridlines at 50% and 75% if in range */}
        {[50, 75].filter(v => v >= minY - 5 && v <= maxY + 5).map(v => (
          <line key={v} x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="rgba(0,212,255,0.05)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points */}
        {data.map((d, i) => {
          const dotColor = d.pct >= 70 ? 'var(--success)' : d.pct >= 50 ? 'var(--xp-gold)' : 'var(--error)';
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.pct)} r={4} fill={dotColor} stroke="var(--bg-card)" strokeWidth="2" />
              {(i === 0 || i === n - 1) && (
                <text x={x(i)} y={y(d.pct) - 10} textAnchor="middle" fontSize="10" fill={dotColor} fontWeight="600">{d.pct}%</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
        <span>{data[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{data[data.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function PracticeTestCard({ user, navigate }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    fetch(`/api/practice-test/history/${user.id}`)
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setHistory(d.results || []))
      .catch(() => setHistory([]));
  }, [user.id]);

  const taken = history && history.length > 0;
  const best = taken ? Math.max(...history.map(h => h.total_score)) : null;
  const last = taken ? history[0].total_score : null;
  const isPro = user.plan === 'paid';

  return (
    <div onClick={() => navigate(isPro ? '/practice-test' : '/upgrade', isPro ? undefined : { state: { reason: 'Full practice tests' } })}
      style={{ backgroundImage: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,77,255,0.06))', padding: '18px 24px', borderRadius: '14px', border: '1px solid rgba(0,212,255,0.25)', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.6)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'; }}>
      <FileText size={24} color="var(--primary)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Full Practice Test
          {!isPro && <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--xp-gold)', backgroundColor: 'rgba(255,215,64,0.12)', border: '1px solid rgba(255,215,64,0.3)', borderRadius: '6px', padding: '1px 6px' }}>PRO</span>}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {taken
            ? `Best ${best} · last ${last} · timed, scored 400-1600`
            : 'A timed two-section SAT simulation, scored 400-1600'}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); navigate(isPro ? '/practice-test' : '/upgrade', isPro ? undefined : { state: { reason: 'Full practice tests' } }); }}
        style={{ padding: '8px 18px', fontSize: '0.85rem', backgroundColor: 'rgba(0,212,255,0.1)', color: 'var(--primary)', border: '1px solid rgba(0,212,255,0.4)', borderRadius: '8px', whiteSpace: 'nowrap' }}>
        {isPro ? (taken ? 'Retake' : 'Start') : 'Unlock'}
      </button>
    </div>
  );
}

export default function Dashboard({ user, isMobile }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setProgress(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/review/count?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setReviewCount(data.count || 0))
      .catch(() => {});
    fetch(`/api/insights/${user.id}`)
      .then(r => r.json())
      .then(setInsights)
      .catch(() => {});
  }, [user.id]);

  const greetingName = user.display_name && user.display_name !== 'Learner' ? user.display_name : null;

  const pad = isMobile ? '20px 16px' : '48px';

  return (
    <div style={{ padding: pad, maxWidth: '920px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '6px' }}>
        {greetingName ? `Welcome back, ${greetingName}!` : 'Ready to train?'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '24px' : '40px', fontSize: '0.95rem' }}>
        {loading || !progress
          ? 'Loading your progress...'
          : progress.totalAnswered === 0
          ? 'Start your first sprint to see progress here.'
          : `${progress.totalAnswered} question${progress.totalAnswered === 1 ? '' : 's'} answered total.`
        }
      </p>

      {/* Weekly stats */}
      <WeeklyStatsWidget user={user} />

      {/* Quick start */}
      <QuickStartCard navigate={navigate} user={user} />

      {/* Study plan */}
      <StudyPlanWidget user={user} navigate={navigate} />

      {/* AI Insights panel */}
      {insights && (insights.insights?.length > 0 || insights.aiInsight) && (
        <div style={{ backgroundColor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.18)', borderRadius: '16px', padding: '18px 24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Today's Focus</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.aiInsight && (
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>{insights.aiInsight}</p>
            )}
            {insights.insights?.map((ins, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ marginTop: '3px', flexShrink: 0 }}>
                  {ins.type === 'review' ? <BookOpen size={13} color="var(--xp-gold)" /> :
                   ins.type === 'urgency' ? <AlertCircle size={13} color="var(--error)" /> :
                   ins.type === 'neglect' ? <AlertCircle size={13} color="var(--xp-gold)" /> :
                   <TrendingUp size={13} color="var(--success)" />}
                </span>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sprint modes */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Start a Sprint</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { mode: 'adaptive', label: 'Adaptive', sub: 'AI targets your weaknesses', icon: <Shuffle size={20} />, color: 'var(--primary)' },
            { mode: 'math', label: 'Math', sub: 'Algebra, Geometry & more', icon: <Calculator size={20} />, color: 'var(--primary)' },
            { mode: 'english', label: 'English', sub: 'Reading, Writing & Language', icon: <BookOpen size={20} />, color: 'var(--xp-gold)' },
          ].map(m => (
            <button key={m.mode}
              onClick={() => navigate('/sprint', { state: { mode: m.mode } })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', padding: '16px 18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <span style={{ color: m.color }}>{m.icon}</span>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{m.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Review Errors CTA */}
      <div onClick={() => reviewCount > 0 && navigate('/review')}
        style={{ backgroundColor: 'var(--bg-card)', padding: '18px 24px', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '16px', opacity: reviewCount > 0 ? 1 : 0.5, cursor: reviewCount > 0 ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
        onMouseEnter={e => { if (reviewCount > 0) e.currentTarget.style.borderColor = 'var(--xp-gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
        <BookOpen size={24} color="var(--xp-gold)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Review Errors</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {reviewCount > 0
              ? `${reviewCount} question${reviewCount !== 1 ? 's' : ''} queued -- up to +35 XP each when mastered`
              : 'Answer some questions incorrectly to build your review queue'}
          </div>
        </div>
        {reviewCount > 0 && (
          <button onClick={e => { e.stopPropagation(); navigate('/review'); }}
            style={{ padding: '8px 18px', fontSize: '0.85rem', backgroundColor: 'rgba(255,215,64,0.1)', color: 'var(--xp-gold)', border: '1px solid rgba(255,215,64,0.4)', borderRadius: '8px', whiteSpace: 'nowrap' }}>
            Review Now
          </button>
        )}
      </div>

      {/* Full practice test */}
      <PracticeTestCard user={user} navigate={navigate} />

      {/* Predicted score */}
      {progress?.predictedScore && (
        <div style={{ backgroundColor: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '16px', padding: '20px 28px', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <TrendingUp size={28} color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Predicted Score Range</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{progress.predictedScore.range}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>R&amp;W {progress.predictedScore.english ?? '--'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Math {progress.predictedScore.math ?? '--'}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '40px' }}>
        {loading
          ? DOMAINS.map(d => (
              <div key={d.name} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: '12px', width: '70%', marginBottom: '14px' }} />
                <div className="skeleton" style={{ height: '28px', width: '50%' }} />
              </div>
            ))
          : DOMAINS.map(d => (
              <DomainCard key={d.name} name={d.name} stats={progress?.domainStats?.[d.name]} />
            ))
        }
      </div>

      {/* Sprint history with sparkline */}
      {progress?.recentSprints?.length > 1 && (
        <>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Sprint History</h2>
          <SprintSparkline sprints={progress.recentSprints} />
        </>
      )}
      {progress?.recentSprints?.length === 1 && (
        <>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Sprint History</h2>
          {progress.recentSprints.map(s => {
            const pct = s.questions_attempted > 0 ? Math.round(s.questions_correct / s.questions_attempted * 100) : 0;
            return (
              <div key={s.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '12px 20px', display: 'flex', alignItems: 'center', border: '1px solid var(--border)' }}>
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
        </>
      )}

      {!loading && progress?.totalAnswered === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <BarChart2 size={36} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
          <p>Domain stats appear after you answer questions in a sprint.</p>
        </div>
      )}
    </div>
  );
}
