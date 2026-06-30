import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Edit2, Upload, RotateCcw, AlertTriangle, Crown, Mail, LogOut, Cloud } from 'lucide-react';
import AuthModal from '../components/AuthModal';

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const ALL_DOMAINS = [...MATH_DOMAINS, ...ENG_DOMAINS];

export default function Profile({ user, setUser, onSignOut }) {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
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
          body: JSON.stringify({ image: base64, mimeType: file.type, userId: user.id })
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
    marginBottom: '16px', border: '1px solid var(--border)'
  };
  const labelStyle = {
    fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase',
    letterSpacing: '1.5px', marginBottom: '14px'
  };

  return (
    <div style={{ padding: 'clamp(16px, 5vw, 48px)', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '32px' }}>Profile</h1>

      {/* Display name */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Display Name</div>
        {editingName ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
              style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
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

      {/* Account: signed-in users see their email + sign out; guests get a
          prompt to claim their progress without leaving the app. */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Account</div>
        {user.email ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <Mail size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
            </div>
            {onSignOut && (
              <button onClick={onSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <LogOut size={14} /> Sign out
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '220px' }}>
              <Cloud size={20} color="var(--xp-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>You're using a guest account</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Create a free account to save your progress and sync across devices. Clearing your browser would erase a guest.
                </div>
              </div>
            </div>
            <button className="primary" onClick={() => setAuthOpen(true)}
              style={{ padding: '11px 20px', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Save my progress
            </button>
          </div>
        )}
      </div>

      {/* Plan */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Plan</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user.plan === 'paid'
              ? <><Crown size={20} color="var(--xp-gold)" /><span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pro</span></>
              : <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Free</span>}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user.plan === 'paid' ? 'Full access' : '3 sprints/day'}
            </span>
          </div>
          <button onClick={() => navigate('/upgrade')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, color: user.plan === 'paid' ? 'var(--text-secondary)' : 'var(--primary)', borderColor: user.plan === 'paid' ? 'var(--border)' : 'rgba(232, 100, 60,0.4)' }}>
            {user.plan === 'paid' ? 'Manage' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>

      {/* Scores */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={labelStyle}>Baseline Scores</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {scoreMsg && <span style={{ color: 'var(--success)', fontSize: '0.82rem' }}>{scoreMsg}</span>}
            <button onClick={() => user.plan === 'paid' ? fileInputRef.current?.click() : navigate('/upgrade', { state: { reason: 'Score report import' } })} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem', color: uploading ? 'var(--text-secondary)' : 'var(--primary)', borderColor: 'rgba(232, 100, 60,0.3)' }}>
              <Upload size={13} /> {uploading ? 'Analyzing...' : 'Upload Report'}{user.plan !== 'paid' ? ' (Pro)' : ''}
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
          <>
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
          {(() => {
            const baseline = (user.baseline_english || 0) + (user.baseline_math || 0);
            const predicted = progress?.predictedScore?.total;
            const gain = predicted && baseline > 0 ? predicted - baseline : null;
            if (gain === null || gain === 0) return null;
            // Below baseline is normal early on (few questions, noisy prediction).
            // Frame it as an amber goal to close, not a red deficit -- the product's
            // whole point is keeping ADHD learners encouraged, not alarmed.
            return (
              <div style={{ marginTop: '12px', textAlign: 'center', padding: '10px 16px', backgroundColor: gain > 0 ? 'rgba(70,183,159,0.07)' : 'rgba(255,215,64,0.07)', borderRadius: '10px', border: `1px solid ${gain > 0 ? 'rgba(70,183,159,0.25)' : 'rgba(255,215,64,0.25)'}` }}>
                <span style={{ color: gain > 0 ? 'var(--success)' : 'var(--xp-gold)', fontWeight: '700', fontSize: '0.9rem' }}>
                  {gain > 0 ? `+${gain} points above your baseline` : `${Math.abs(gain)} points to your baseline goal -- keep building accuracy!`}
                </span>
              </div>
            );
          })()}
          </>
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
        <div style={{ height: '7px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
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
                border: weakAreas.includes(d) ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: weakAreas.includes(d) ? 'rgba(232, 100, 60,0.1)' : 'transparent',
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
              const color = acc === null ? 'var(--bg-elevated)' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
              return (
                <div key={d}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{d}</span>
                    <span style={{ color, fontWeight: '600' }}>{acc === null ? '--' : `${Math.round(acc * 100)}%`}</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
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
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
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

      {/* Export Data */}
      <div style={{ ...sectionStyle, marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={labelStyle}>Export Data</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-6px' }}>
            Download your full question history as CSV for tutors or personal tracking.
          </p>
        </div>
        <a href={`/api/users/${user.id}/export`} download="adhdsat-history.csv"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '0.85rem', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Upload size={14} /> Export CSV
        </a>
      </div>

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

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          title="Save your progress"
          blurb="Link an email or Google account. Your current streak, XP, and history move with you and sync across devices."
        />
      )}
    </div>
  );
}
