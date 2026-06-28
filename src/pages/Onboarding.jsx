import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];

export default function Onboarding({ user, setUser }) {
  const [step, setStep] = useState(1);
  const [englishScore, setEnglishScore] = useState(630);
  const [mathScore, setMathScore] = useState(730);
  const [weakAreas, setWeakAreas] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [targetScore, setTargetScore] = useState(1400);
  const [testDate, setTestDate] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Keep targetScore above baseline when scores change
  useEffect(() => {
    const baseline = englishScore + mathScore;
    if (targetScore <= baseline) setTargetScore(Math.min(1600, baseline + 40));
  }, [englishScore, mathScore]);

  const toggleDomain = (domain) => {
    setWeakAreas(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('Analyzing score report...');
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
          if (data.english_score) setEnglishScore(data.english_score);
          if (data.math_score) setMathScore(data.math_score);
          if (data.weak_areas?.length) setWeakAreas(data.weak_areas);
          setUploadMsg('Score report analyzed! Fields pre-filled.');
        } else {
          setUploadMsg('Could not parse report. Please fill in manually.');
        }
      } catch {
        setUploadMsg('Analysis failed. Please fill in manually.');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, baseline_english: englishScore, baseline_math: mathScore, weak_areas: weakAreas })
      });
      const updated = await res.json();
      setUser(updated);
      // Always save target score; include test date if provided
      await fetch(`/api/study-plan/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_score: targetScore, ...(testDate ? { test_date: testDate } : {}) })
      }).catch(() => {});
      navigate('/sprint', { state: { mode: 'adaptive' } });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const containerStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: '48px 24px',
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: 'clamp(16px, 5vw, 48px)',
    border: '1px solid #2a2a46', width: '100%', maxWidth: '560px'
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '2px', marginBottom: '8px' }}>ADHDSat</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Adaptive SAT prep for the way your brain works</div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            width: s === step ? '32px' : '8px', height: '8px', borderRadius: '4px',
            backgroundColor: s <= step ? 'var(--primary)' : '#2a2a46',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>

      {step === 1 && (
        <div style={cardStyle}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Where are you starting?</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.5 }}>Enter your last SAT scores, or your best estimate. We'll calibrate from here.</p>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Reading &amp; Writing
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input type="range" min={200} max={800} step={10} value={englishScore}
                onChange={e => setEnglishScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)', height: '4px' }} />
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', minWidth: '56px', textAlign: 'right' }}>{englishScore}</span>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Math
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input type="range" min={200} max={800} step={10} value={mathScore}
                onChange={e => setMathScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)', height: '4px' }} />
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', minWidth: '56px', textAlign: 'right' }}>{mathScore}</span>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" style={{ display: 'none' }} onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px', justifyContent: 'center', borderStyle: 'dashed', borderColor: '#2a2a46', color: 'var(--text-secondary)' }}>
              <Upload size={16} /> {uploading ? 'Analyzing...' : 'Upload past score report (PNG/JPG, optional)'}
            </button>
            {uploadMsg && <p style={{ color: uploadMsg.includes('pre-filled') ? 'var(--success)' : 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '8px', textAlign: 'center' }}>{uploadMsg}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(0,212,255,0.06)', borderRadius: '10px', marginBottom: '24px', border: '1px solid rgba(0,212,255,0.15)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Combined baseline</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{englishScore + mathScore}</span>
          </div>

          <button className="primary" onClick={() => setStep(2)} style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Next: Weak Areas <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Where do you struggle most?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>Select every domain you want to prioritize. We'll skew your questions there.</p>

          {[['Math', MATH_DOMAINS], ['Reading & Writing', ENG_DOMAINS]].map(([section, domains]) => (
            <div key={section} style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>{section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {domains.map(domain => (
                  <button key={domain} onClick={() => toggleDomain(domain)}
                    style={{
                      textAlign: 'left', padding: '11px 16px', borderRadius: '10px',
                      border: weakAreas.includes(domain) ? '2px solid var(--primary)' : '2px solid #2a2a46',
                      backgroundColor: weakAreas.includes(domain) ? 'rgba(0,212,255,0.08)' : 'transparent',
                      color: weakAreas.includes(domain) ? 'var(--primary)' : 'var(--text-primary)',
                      transition: 'all 0.15s', fontSize: '0.95rem'
                    }}>
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep(1)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="primary" onClick={() => setStep(3)} style={{ flex: 1, padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Next: Confirm <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎯</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Set Your Target</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>ADHDSat will adapt every question to close your gap.</p>
          </div>

          {/* Baseline summary */}
          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #2a2a46' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: weakAreas.length > 0 ? '16px' : '0' }}>
              {[['Baseline R&W', englishScore], ['Baseline Math', mathScore], ['Total', englishScore + mathScore]].map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: label === 'Total' ? 'var(--xp-gold)' : 'var(--primary)' }}>{val}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
            {weakAreas.length > 0 && (
              <div style={{ borderTop: '1px solid #2a2a46', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Focus areas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {weakAreas.map(a => (
                    <span key={a} style={{ backgroundColor: 'rgba(0,212,255,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target score */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Target Score
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input type="range" min={englishScore + mathScore} max={1600} step={10} value={targetScore}
                onChange={e => setTargetScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)', height: '4px' }} />
              <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--xp-gold)', minWidth: '56px', textAlign: 'right' }}>{targetScore}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Gap: +{targetScore - (englishScore + mathScore)} points
            </div>
          </div>

          {/* Test date */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Test Date <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', backgroundColor: 'var(--bg-main)', border: '1px solid #2a2a46', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#2a2a46'}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(2)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="primary animate-pop" onClick={handleComplete} disabled={submitting}
              style={{ flex: 1, padding: '14px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={18} fill="currentColor" /> {submitting ? 'Starting...' : 'Begin First Sprint'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
