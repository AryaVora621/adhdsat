import React, { useState } from 'react';
import {
  Zap, Brain, Timer, Repeat, Trophy, LineChart, Moon, Sun,
  ArrowRight, Check, Mail, Sparkles, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

const FEATURES = [
  { icon: Timer, title: 'Focus sprints', body: 'Bite-size sets you can finish in one sitting. No 4-hour slogs, just momentum you can actually start.' },
  { icon: Brain, title: 'Adapts to you', body: 'Difficulty tunes to your level in real time, so you stay in the sweet spot between bored and overwhelmed.' },
  { icon: Repeat, title: 'Spaced review', body: 'Mistakes come back exactly when you are about to forget them. The hard stuff sticks without rereading.' },
  { icon: Trophy, title: 'XP, streaks & wins', body: 'Every correct answer pays out instantly. Visible progress is the dopamine that keeps ADHD brains coming back.' },
  { icon: LineChart, title: 'Real practice tests', body: 'Full adaptive, scaled 400-1600, with a missed-answer review that turns the test into a study session.' },
  { icon: Sparkles, title: 'An AI coach', body: 'Stuck? Get a step-by-step explanation in plain language, plus insight on exactly where to focus next.' },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme !== 'light';
  return (
    <button onClick={toggle} aria-label="Toggle light or dark mode"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)',
        color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
      }}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? 'Light' : 'Dark'}
    </button>
  );
}

function AuthModal({ onClose, onGuest }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45)', position: 'relative',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, padding: 6, borderRadius: 8,
          background: 'transparent', border: 'none', color: 'var(--text-secondary)',
        }}><X size={18} /></button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ display: 'inline-flex', padding: 16, borderRadius: 16, background: 'rgba(0,212,255,0.1)', marginBottom: 16 }}>
              <Mail size={28} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 8, color: 'var(--text-primary)' }}>Check your inbox</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              We sent a magic link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              Tap it to sign in. No password needed.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 6, color: 'var(--text-primary)' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: '0.95rem' }}>
              Sign in to sync your streak, XP, and progress across every device.
            </p>

            <button onClick={google} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '12px', borderRadius: 12, marginBottom: 16,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontWeight: 600,
            }}>
              <GoogleGlyph /> Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={sendMagicLink}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 12,
                  background: 'var(--bg-main)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.95rem',
                }} />
              <button type="submit" className="primary" disabled={busy} style={{
                width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {busy ? 'Sending...' : <>Email me a magic link <ArrowRight size={16} /></>}
              </button>
            </form>

            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              New here?{' '}
              <button onClick={() => { onClose(); onGuest(); }} style={{
                background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, padding: 0,
              }}>Start free, no account</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// A concrete, on-brand product preview so the hero shows the thing, not a stock blob.
function SprintPreview() {
  return (
    <div className="landing-preview" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
      padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.5 }}>
          <Zap size={15} fill="currentColor" /> FOCUS SPRINT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--xp-gold)', fontWeight: 700, fontSize: '0.8rem' }}>
          <Trophy size={14} /> +40 XP
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ width: '66%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--primary), var(--xp-gold))' }} />
      </div>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
        If 3x + 7 = 28, what is the value of x?
      </p>
      {['x = 5', 'x = 7', 'x = 9', 'x = 12'].map((c, i) => (
        <div key={c} style={{
          padding: '11px 14px', borderRadius: 12, marginBottom: 9, fontSize: '0.92rem',
          border: `1px solid ${i === 1 ? 'var(--success)' : 'var(--border)'}`,
          background: i === 1 ? 'rgba(0,230,118,0.12)' : 'var(--bg-main)',
          color: i === 1 ? 'var(--success)' : 'var(--text-secondary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: i === 1 ? 700 : 500,
        }}>
          {c} {i === 1 && <Check size={16} />}
        </div>
      ))}
    </div>
  );
}

export default function Landing({ onGuest }) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowY: 'auto', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <style>{`
        .landing-display { font-family: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
        .landing-mesh {
          position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
        }
        .landing-mesh::before, .landing-mesh::after {
          content: ''; position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.5;
        }
        .landing-mesh::before { width: 520px; height: 520px; top: -160px; right: -120px;
          background: radial-gradient(circle, var(--primary), transparent 70%); }
        .landing-mesh::after { width: 460px; height: 460px; top: 120px; left: -160px;
          background: radial-gradient(circle, var(--xp-gold), transparent 70%); opacity: 0.28; }
        .landing-reveal { opacity: 0; transform: translateY(16px); animation: landingUp 0.7s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes landingUp { to { opacity: 1; transform: none; } }
        .landing-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center; }
        .landing-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .feature-card { transition: transform .2s ease, border-color .2s ease; }
        .feature-card:hover { transform: translateY(-4px); border-color: var(--primary); }
        @media (max-width: 880px) {
          .landing-grid { grid-template-columns: 1fr; gap: 36px; }
          .landing-features { grid-template-columns: repeat(2, 1fr); }
          .landing-preview { max-width: 420px; margin: 0 auto; }
        }
        @media (max-width: 560px) {
          .landing-features { grid-template-columns: 1fr; }
        }
        /* Respect reduced-motion: show content immediately, skip the reveal. */
        @media (prefers-reduced-motion: reduce) {
          .landing-reveal { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      {/* Nav */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px clamp(20px, 5vw, 64px)', position: 'relative', zIndex: 2,
      }}>
        <div className="landing-display" style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: '1.3rem' }}>
          <Zap size={22} color="var(--primary)" fill="var(--primary)" /> ADHDSat
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <button onClick={() => setAuthOpen(true)} style={{
            padding: '8px 18px', borderRadius: 999, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)',
          }}>Sign in</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', padding: '40px clamp(20px, 5vw, 64px) 72px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="landing-mesh" />
        <div className="landing-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="landing-reveal" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999,
              border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.82rem',
              fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 22,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--success)' }} />
              1,000+ original questions · built for ADHD focus
            </div>
            <h1 className="landing-display landing-reveal" style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', lineHeight: 1.02, fontWeight: 800,
              marginBottom: 22, animationDelay: '.05s',
            }}>
              SAT prep that<br />works <span style={{
                background: 'linear-gradient(90deg, var(--primary), var(--xp-gold))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>with your brain</span>,<br />not against it.
            </h1>
            <p className="landing-reveal" style={{
              fontSize: '1.12rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              maxWidth: 480, marginBottom: 30, animationDelay: '.12s',
            }}>
              Short adaptive sprints. Instant feedback. XP for every win.
              The friction-free way to actually start studying and keep your streak alive.
            </p>
            <div className="landing-reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, animationDelay: '.18s' }}>
              <button className="primary" onClick={onGuest} style={{
                padding: '14px 28px', borderRadius: 14, fontWeight: 700, fontSize: '1rem',
                display: 'inline-flex', alignItems: 'center', gap: 9,
              }}>
                Start free <ArrowRight size={18} />
              </button>
              <button onClick={() => setAuthOpen(true)} style={{
                padding: '14px 26px', borderRadius: 14, fontWeight: 600, fontSize: '1rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
              }}>
                I have an account
              </button>
            </div>
            <p className="landing-reveal" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', animationDelay: '.24s' }}>
              No credit card. No setup. Your first sprint is 60 seconds away.
            </p>
          </div>
          <div className="landing-reveal" style={{ animationDelay: '.16s' }}>
            <SprintPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '20px clamp(20px, 5vw, 64px) 40px', maxWidth: 1180, margin: '0 auto' }}>
        <h2 className="landing-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: 10 }}>
          Designed around how focus actually works
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 560, marginBottom: 32, lineHeight: 1.6 }}>
          Every feature exists to lower the cost of starting and raise the reward of finishing.
        </p>
        <div className="landing-features">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="feature-card" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 22,
            }}>
              <div style={{ display: 'inline-flex', padding: 10, borderRadius: 12, background: 'rgba(0,212,255,0.1)', marginBottom: 14 }}>
                <Icon size={20} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ padding: 'clamp(40px, 7vw, 80px) clamp(20px, 5vw, 64px)', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 'clamp(36px, 6vw, 64px)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <div className="landing-mesh" style={{ opacity: 0.7 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="landing-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: 14 }}>
              Your next score starts with one sprint.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Free to start. Upgrade to Pro for unlimited sprints, full practice tests, and AI insights whenever you are ready.
            </p>
            <button className="primary" onClick={onGuest} style={{
              padding: '15px 34px', borderRadius: 14, fontWeight: 700, fontSize: '1.05rem',
              display: 'inline-flex', alignItems: 'center', gap: 9,
            }}>
              Start free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer style={{
        padding: '28px clamp(20px, 5vw, 64px)', borderTop: '1px solid var(--border)',
        display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between',
        color: 'var(--text-secondary)', fontSize: '0.85rem',
      }}>
        <span className="landing-display" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>ADHDSat</span>
        <span>Built for the way your brain works. © 2026</span>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onGuest={onGuest} />}
    </div>
  );
}
