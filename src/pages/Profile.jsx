import React, { useState, useEffect } from 'react';
import { Check, Edit2 } from 'lucide-react';

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const ALL_DOMAINS = [...MATH_DOMAINS, ...ENG_DOMAINS];

export default function Profile({ user, setUser }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.display_name || '');
  const [weakAreas, setWeakAreas] = useState(user.weak_areas || []);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(setProgress)
      .catch(() => {});
  }, [user.id]);

  const saveName = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: nameInput })
      });
      setUser(await res.json());
      setEditingName(false);
    } finally { setSaving(false); }
  };

  const saveWeakAreas = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weak_areas: weakAreas })
      });
      setUser(await res.json());
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {}
  };

  const toggleDomain = (domain) => {
    setWeakAreas(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
  };

  const level = Math.floor(user.total_xp / 500) + 1;
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNextLevel = level * 500;
  const xpProgress = ((user.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const sectionStyle = {
    backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px',
    marginBottom: '16px', border: '1px solid #2a2a46'
  };
  const labelStyle = {
    fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase',
    letterSpacing: '1.5px', marginBottom: '14px'
  };

  return (
    <div style={{ padding: '48px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '32px' }}>Profile</h1>

      {/* Display name */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Display Name</div>
        {editingName ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
              style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'white', fontSize: '1rem', outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="primary" onClick={saveName} disabled={saving}
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
              <Check size={15} /> Save
            </button>
            <button onClick={() => { setEditingName(false); setNameInput(user.display_name || ''); }}
              style={{ padding: '10px 14px', fontSize: '0.9rem' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{user.display_name || 'Learner'}</span>
            <button onClick={() => setEditingName(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <Edit2 size={13} /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Scores */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Scores</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Baseline R&W', value: user.baseline_english || '--' },
            { label: 'Baseline Math', value: user.baseline_math || '--' },
            { label: 'Predicted Range', value: progress?.predictedScore?.range || (progress?.totalAnswered < 20 ? '20+ Qs needed' : '--') }
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* XP & Level */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
          {[
            { label: 'Level', value: level },
            { label: 'Total XP', value: user.total_xp },
            { label: 'Streak', value: `${user.current_streak}d` },
            { label: 'Best Streak', value: `${user.longest_streak}d` }
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '10px', padding: '12px 8px' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--xp-gold)' }}>{item.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Level {level}</span>
          <span>{user.total_xp - xpForCurrentLevel} / {xpForNextLevel - xpForCurrentLevel} XP</span>
        </div>
        <div style={{ height: '7px', backgroundColor: '#0f0f1a', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(xpProgress, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Weak areas */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={labelStyle}>Focus Areas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveMsg && <span style={{ color: 'var(--success)', fontSize: '0.82rem' }}>{saveMsg}</span>}
            <button className="primary" onClick={saveWeakAreas} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Save</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_DOMAINS.map(d => (
            <button key={d} onClick={() => toggleDomain(d)}
              style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '0.82rem', transition: 'all 0.15s',
                border: weakAreas.includes(d) ? '1px solid var(--primary)' : '1px solid #2a2a46',
                backgroundColor: weakAreas.includes(d) ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: weakAreas.includes(d) ? 'var(--primary)' : 'var(--text-secondary)' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Domain accuracy bars */}
      {progress?.domainStats && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Domain Accuracy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ALL_DOMAINS.map(d => {
              const acc = progress.domainStats[d]?.accuracy;
              const color = acc === null ? '#3a3a56' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
              return (
                <div key={d}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{d}</span>
                    <span style={{ color, fontWeight: '600' }}>{acc === null ? '--' : `${Math.round(acc * 100)}%`}</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: '#2a2a46', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${acc === null ? 0 : acc * 100}%`, height: '100%', backgroundColor: color, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sprint history */}
      {progress?.recentSprints?.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Sprint History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                {['Date', 'Questions', 'Accuracy', 'XP'].map(h => (
                  <th key={h} style={{ padding: '6px 0', fontWeight: 'normal', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progress.recentSprints.map(s => {
                const pct = s.questions_attempted > 0 ? Math.round(s.questions_correct / s.questions_attempted * 100) : 0;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid #2a2a46' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>
                      {new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 0' }}>{s.questions_attempted}</td>
                    <td style={{ padding: '10px 0', color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--xp-gold)' : 'var(--error)', fontWeight: '600' }}>
                      {pct}%
                    </td>
                    <td style={{ padding: '10px 0', color: 'var(--xp-gold)' }}>+{s.xp_earned}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
