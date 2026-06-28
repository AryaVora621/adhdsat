import React, { useState, useEffect, useRef } from 'react';
import { Check, Edit2, Upload, RotateCcw, AlertTriangle } from 'lucide-react';

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
  // Score editing
  const [editingScores, setEditingScores] = useState(false);
  const [engInput, setEngInput] = useState(user.baseline_english || 0);
  const [mathInput, setMathInput] = useState(user.baseline_math || 0);
  const [scoreMsg, setScoreMsg] = useState('');
  // Score report upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileInputRef = useRef();
  // Reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const saveScores = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_english: engInput, baseline_math: mathInput })
      });
      setUser(await res.json());
      setEditingScores(false);
      setScoreMsg('Scores updated!');
      setTimeout(() => setScoreMsg(''), 2000);
    } catch {}
  };

  const handleScoreReport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('Analyzing with AI...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await fetch('/api/analyze-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType: file.type })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.english_score) setEngInput(data.english_score);
          if (data.math_score) setMathInput(data.math_score);
          if (data.weak_areas?.length) setWeakAreas(data.weak_areas);
          // Auto-save what was extracted
          const saveRes = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseline_english: data.english_score || engInput,
              baseline_math: data.math_score || mathInput,
              weak_areas: data.weak_areas?.length ? data.weak_areas : weakAreas
            })
          });
          setUser(await saveRes.json());
          setUploadMsg(`Extracted: R&W ${data.english_score || '?'}, Math ${data.math_score || '?'}. Weak areas updated.`);
          setEditingScores(true);
        } else {
          setUploadMsg('Could not parse report. Fill in scores manually.');
        }
      } catch {
        setUploadMsg('Analysis failed. Fill in scores manually.');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset`, { method: 'POST' });
      const updated = await res.json();
      setUser(updated);
      setWeakAreas([]);
      setEngInput(0);
      setMathInput(0);
      setShowResetConfirm(false);
      setProgress(null);
      // Reload progress
      fetch(`/api/progress?userId=${user.id}`).then(r => r.json()).then(setProgress).catch(() => {});
    } catch {}
    setResetting(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={labelStyle}>Baseline Scores</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {scoreMsg && <span style={{ color: 'var(--success)', fontSize: '0.82rem' }}>{scoreMsg}</span>}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem', color: uploading ? 'var(--text-secondary)' : 'var(--primary)', borderColor: 'rgba(0,212,255,0.3)' }}>
              <Upload size={13} /> {uploading ? 'Analyzing...' : 'Upload Report'}
            </button>
            <input type="file" ref={fileInputRef} accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleScoreReport} />
            <button onClick={() => setEditingScores(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Edit2 size={13} /> Edit
            </button>
          </div>
        </div>
        {uploadMsg && (
          <div style={{ fontSize: '0.82rem', color: uploadMsg.includes('Extracted') ? 'var(--success)' : 'var(--xp-gold)', marginBottom: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
            {uploadMsg}
          </div>
        )}
        {editingScores ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Reading & Writing', val: engInput, set: setEngInput },
              { label: 'Math', val: mathInput, set: setMathInput }
            ].map(({ label, val, set }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{val}</span>
                </div>
                <input type="range" min="200" max="800" step="10" value={val} onChange={e => set(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="primary" onClick={saveScores} style={{ flex: 1, padding: '9px', fontSize: '0.9rem' }}>Save Scores</button>
              <button onClick={() => setEditingScores(false)} style={{ padding: '9px 14px', fontSize: '0.9rem' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Baseline R&W', value: user.baseline_english || '--' },
              { label: 'Baseline Math', value: user.baseline_math || '--' },
              { label: 'Predicted Range', value: progress?.predictedScore?.range || (progress?.totalAnswered < 10 ? '10+ Qs needed' : '--') }
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}
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

      {/* Reset Profile */}
      <div style={{ ...sectionStyle, borderColor: 'rgba(255,82,82,0.2)', marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...labelStyle, color: 'var(--error)' }}>Danger Zone</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-6px' }}>
              Erase all progress, XP, answers, and streaks. Cannot be undone.
            </p>
          </div>
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '0.85rem', borderColor: 'rgba(255,82,82,0.4)', color: 'var(--error)', flexShrink: 0 }}>
              <RotateCcw size={14} /> Reset Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Sure?</span>
              <button onClick={handleReset} disabled={resetting}
                style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: 'rgba(255,82,82,0.15)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)' }}>
                {resetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button onClick={() => setShowResetConfirm(false)} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
