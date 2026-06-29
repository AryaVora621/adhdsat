import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Zap, Crown, ArrowLeft } from 'lucide-react';

const FREE_FEATURES = [
  '3 adaptive sprints per day',
  'Spaced-repetition review queue',
  'Domain performance dashboard',
  'Predicted score range',
];

const PRO_FEATURES = [
  'Unlimited sprints',
  'Full timed practice tests (scored 400-1600)',
  'Score history and trend tracking',
  'Timed single-module drills',
  'AI insights and answer breakdowns',
  'Score report import (auto-fills weak areas)',
];

// Reasons surfaced when a gated action bounced the user here.
const REASON_COPY = {
  daily_limit: "You've used all 3 free sprints today. Upgrade for unlimited practice.",
  'Full practice tests': 'Full practice tests are a Pro feature.',
  'Timed practice modules': 'Timed practice modules are a Pro feature.',
  'AI breakdowns': 'AI answer breakdowns are a Pro feature.',
  'Score report import': 'Score report import is a Pro feature.',
};

export default function Upgrade({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [working, setWorking] = useState(false);
  const reason = location.state?.reason;
  const isPro = user?.plan === 'paid';

  const setPlan = async (plan) => {
    setWorking(true);
    try {
      const res = await fetch(`/api/users/${user.id}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        if (plan === 'paid') navigate(-1);
      }
    } catch {
      // leave the screen up so the user can retry
    } finally {
      setWorking(false);
    }
  };

  const wrap = { padding: 'clamp(16px, 5vw, 48px)', maxWidth: '760px', margin: '0 auto', width: '100%' };

  return (
    <div style={wrap}>
      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Crown size={40} color="var(--xp-gold)" />
      </div>
      <h1 style={{ fontSize: '1.9rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
        {isPro ? "You're on ADHDSat Pro" : 'Upgrade to ADHDSat Pro'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: reason ? '14px' : '28px' }}>
        {isPro ? 'You have full access to every feature. Thanks for supporting the project.' : 'Unlock unlimited practice, full timed tests, and every AI feature.'}
      </p>
      {!isPro && reason && (
        <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,215,64,0.1)', border: '1px solid rgba(255,215,64,0.3)', borderRadius: '12px', padding: '10px 16px', marginBottom: '28px', color: 'var(--xp-gold)', fontSize: '0.88rem', fontWeight: 600 }}>
          {REASON_COPY[reason] || 'Upgrade to unlock this feature.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Free */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid #2a2a46', padding: '24px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '4px' }}>Free</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>$0</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FREE_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                <Check size={16} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
          </div>
          {isPro && (
            <button onClick={() => setPlan('free')} disabled={working}
              style={{ width: '100%', marginTop: '20px', padding: '11px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid #2a2a46', borderRadius: '10px' }}>
              Switch to Free
            </button>
          )}
        </div>

        {/* Pro */}
        <div style={{ backgroundImage: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,77,255,0.08))', borderRadius: '16px', border: '1px solid rgba(0,212,255,0.4)', padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={15} color="var(--primary)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Pro</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>
            Everything <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>in Free, plus:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PRO_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                <Check size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          {!isPro && (
            <button className="primary" onClick={() => setPlan('paid')} disabled={working}
              style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '1rem', fontWeight: 700 }}>
              {working ? 'Activating...' : 'Upgrade to Pro'}
            </button>
          )}
          {isPro && (
            <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>Active</div>
          )}
        </div>
      </div>

      {!isPro && (
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Early access: Pro is free to enable while we finish payment setup. No card required.
        </p>
      )}
    </div>
  );
}
