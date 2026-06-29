import React, { useState } from 'react';
import {
  Zap, Brain, Timer, Repeat, Trophy, LineChart, Moon, Sun,
  ArrowRight, Check, Sparkles,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import AuthModal from '../components/AuthModal';

// "Field Notes" aesthetic: warm paper, terracotta + teal, risograph stickers
// (hard offset shadows, 2px ink borders, organic corners, slight tilts). Scoped
// to this page via --fn-* custom properties so it can ship ahead of the rest of
// the app's restyle. Palette swaps for light vs warm-espresso dark.
const FEATURES = [
  { icon: Timer, title: 'Focus sprints', tint: 'terra', body: 'Bite-size sets you can finish in one sitting. No four-hour slogs, just momentum you can actually start.' },
  { icon: Brain, title: 'Adapts to you', tint: 'teal', body: 'Difficulty tunes to your level in real time, so you stay in the sweet spot between bored and overwhelmed.' },
  { icon: Repeat, title: 'Spaced review', tint: 'gold', body: 'Mistakes come back exactly when you are about to forget them. The hard stuff sticks without rereading.' },
  { icon: Trophy, title: 'Points, streaks & wins', tint: 'terra', body: 'Every correct answer pays out instantly. Visible progress is the dopamine that keeps ADHD brains coming back.' },
  { icon: LineChart, title: 'Real practice tests', tint: 'teal', body: 'Full adaptive, scaled 400-1600, with a missed-answer review that turns the test into a study session.' },
  { icon: Sparkles, title: 'An AI coach', tint: 'gold', body: 'Stuck? Get a step-by-step explanation in plain language, plus insight on exactly where to focus next.' },
];

const STATS = [
  { n: '7', l: '🔥 Day streak', bg: 'var(--fn-terra)', fg: '#FBF7F0' },
  { n: '142', l: 'Questions this week', bg: 'var(--fn-teal)', fg: '#FBF7F0' },
  { n: '84%', l: 'Accuracy', bg: 'var(--fn-gold)', fg: '#2A2622' },
];

function tintColor(t) {
  return t === 'terra' ? 'var(--fn-terra)' : t === 'teal' ? 'var(--fn-teal)' : 'var(--fn-gold)';
}

function FieldToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme !== 'light';
  return (
    <button onClick={toggle} aria-label="Toggle light or dark mode" className="fn-chip"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      {dark ? 'Light' : 'Dark'}
    </button>
  );
}

// A concrete product preview, styled as a sticker-card sitting on the desk.
function SprintPreview() {
  return (
    <div className="fn-deskwrap">
      <div className="fn-card fn-org-a" style={{ position: 'relative', boxShadow: '6px 6px 0 var(--fn-shadow)' }}>
        <div className="fn-sticker">+40<br />XP!</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--fn-teal)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <Zap size={14} fill="currentColor" /> Focus Sprint
          </div>
          <div style={{ color: 'var(--fn-ink60)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.4 }}>Algebra</div>
        </div>
        <p className="fn-display" style={{ color: 'var(--fn-ink)', fontWeight: 700, marginBottom: 16, lineHeight: 1.3, fontSize: '1.25rem' }}>
          If 3x + 7 = 28, what is the value of x?
        </p>
        {['x = 5', 'x = 7', 'x = 9', 'x = 12'].map((c, i) => (
          <div key={c} className={`fn-opt ${i % 2 ? 'fn-org-b' : 'fn-org-c'}`} style={{
            background: i === 1 ? 'var(--fn-teal)' : 'var(--fn-paper)',
            color: i === 1 ? '#FBF7F0' : 'var(--fn-ink)',
          }}>
            {c} {i === 1 && <Check size={16} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing({ onGuest }) {
  const [authOpen, setAuthOpen] = useState(false);
  const { theme } = useTheme();
  const dark = theme === 'light' ? false : true;

  // Palette as inline custom properties so the scoped CSS below stays one source
  // of truth and reacts to the theme toggle.
  const palette = dark
    ? { paper: '#221E1A', paper2: '#2A2622', ink: '#FBF7F0', ink60: 'rgba(251,247,240,0.62)',
        line: '#FBF7F0', shadow: '#100D0B', terra: '#FF7A4D', teal: '#46B79F', gold: '#FFC93D' }
    : { paper: '#FBF7F0', paper2: '#F3ECDF', ink: '#2A2622', ink60: 'rgba(42,38,34,0.62)',
        line: '#2A2622', shadow: '#2A2622', terra: '#E8643C', teal: '#2E7D6F', gold: '#F2B705' };

  const rootStyle = {
    width: '100%', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto',
    background: 'var(--fn-paper)', color: 'var(--fn-ink)', position: 'relative',
    fontFamily: "'Spline Sans', system-ui, sans-serif",
    '--fn-paper': palette.paper, '--fn-paper2': palette.paper2, '--fn-ink': palette.ink,
    '--fn-ink60': palette.ink60, '--fn-line': palette.line, '--fn-shadow': palette.shadow,
    '--fn-terra': palette.terra, '--fn-teal': palette.teal, '--fn-gold': palette.gold,
  };

  return (
    <div style={rootStyle}>
      <style>{`
        .fn-display { font-family: 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: -0.02em; }
        .fn-hand { font-family: 'Caveat', cursive; }
        /* paper grain */
        .fn-grain::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 50; opacity: 0.05;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .fn-org-a { border-radius: 18px 22px 16px 20px; }
        .fn-org-b { border-radius: 11px 9px 12px 10px; }
        .fn-org-c { border-radius: 12px 10px 11px 9px; }
        .fn-card { background: var(--fn-paper); border: 2px solid var(--fn-line); padding: 22px; }
        .fn-chip { background: var(--fn-paper); border: 2px solid var(--fn-line); color: var(--fn-ink);
          font-weight: 600; font-size: 0.85rem; padding: 7px 15px; border-radius: 11px 9px 12px 8px;
          box-shadow: 2px 2px 0 var(--fn-shadow); cursor: pointer; }
        .fn-btn { background: var(--fn-terra); color: #FBF7F0; font-weight: 700; font-size: 1rem;
          padding: 14px 28px; border: 2px solid var(--fn-line); border-radius: 14px 11px 13px 10px;
          box-shadow: 4px 4px 0 var(--fn-shadow); cursor: pointer; font-family: 'Bricolage Grotesque', sans-serif;
          display: inline-flex; align-items: center; gap: 9px; transition: transform .12s ease, box-shadow .12s ease; }
        .fn-btn:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--fn-shadow); }
        .fn-btn:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--fn-shadow); }
        .fn-btn.ghost { background: var(--fn-paper); color: var(--fn-ink); }
        .fn-deskwrap { padding: 16px 14px 6px; }
        .fn-sticker { position: absolute; top: -18px; right: -14px; background: var(--fn-gold);
          border: 2px solid var(--fn-line); border-radius: 50%; width: 62px; height: 62px;
          display: grid; place-items: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
          font-size: 0.82rem; text-align: center; line-height: 1; color: #2A2622; transform: rotate(11deg);
          box-shadow: 3px 3px 0 var(--fn-shadow); }
        .fn-opt { border: 2px solid var(--fn-line); padding: 12px 15px; margin-bottom: 9px; font-weight: 600;
          font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; }
        .fn-grid { display: grid; grid-template-columns: 1.18fr 0.92fr; gap: 50px; align-items: center; }
        .fn-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .fn-fc { background: var(--fn-paper); border: 2px solid var(--fn-line); padding: 22px;
          box-shadow: 4px 4px 0 var(--fn-shadow); transition: transform .15s ease, box-shadow .15s ease; }
        .fn-fc:hover { transform: translate(-1px,-2px); box-shadow: 5px 6px 0 var(--fn-shadow); }
        .fn-fc:nth-child(1){ border-radius:18px 22px 16px 20px; transform: rotate(-1.2deg); }
        .fn-fc:nth-child(2){ border-radius:20px 16px 22px 18px; transform: rotate(0.8deg); }
        .fn-fc:nth-child(3){ border-radius:16px 20px 18px 22px; transform: rotate(-0.5deg); }
        .fn-fc:nth-child(4){ border-radius:22px 18px 20px 16px; transform: rotate(1deg); }
        .fn-fc:nth-child(5){ border-radius:18px 20px 16px 22px; transform: rotate(-0.9deg); }
        .fn-fc:nth-child(6){ border-radius:20px 18px 22px 16px; transform: rotate(0.6deg); }
        .fn-fc:hover:nth-child(odd){ transform: rotate(-0.4deg) translateY(-2px); }
        .fn-fc:hover:nth-child(even){ transform: rotate(0.4deg) translateY(-2px); }
        .fn-ictile { display: inline-grid; place-items: center; width: 44px; height: 44px;
          border: 2px solid var(--fn-line); border-radius: 11px 9px 12px 10px; margin-bottom: 14px; }
        .fn-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
        .fn-stat { border: 2px solid var(--fn-line); padding: 24px 26px; box-shadow: 5px 5px 0 var(--fn-shadow); }
        .fn-stat:nth-child(1){ border-radius:18px 22px 16px 20px; transform: rotate(-1.2deg); }
        .fn-stat:nth-child(2){ border-radius:20px 16px 22px 18px; transform: rotate(0.8deg); }
        .fn-stat:nth-child(3){ border-radius:16px 20px 18px 22px; transform: rotate(-0.7deg); }
        .fn-reveal { opacity: 0; transform: translateY(16px); animation: fnUp 0.7s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes fnUp { to { opacity: 1; transform: none; } }
        @media (max-width: 880px) {
          .fn-grid { grid-template-columns: 1fr; gap: 30px; }
          .fn-features { grid-template-columns: repeat(2, 1fr); }
          .fn-deskwrap { max-width: 440px; margin: 0 auto; }
        }
        @media (max-width: 560px) {
          .fn-features { grid-template-columns: 1fr; }
          .fn-stats { grid-template-columns: 1fr; gap: 22px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fn-reveal { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <div className="fn-grain" />

      {/* Nav */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '22px clamp(20px, 5vw, 56px)', position: 'relative', zIndex: 2,
      }}>
        <div className="fn-display" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.4rem' }}>
          <span style={{
            width: 32, height: 32, background: 'var(--fn-terra)', color: '#FBF7F0',
            borderRadius: '9px 11px 8px 12px', display: 'grid', placeItems: 'center',
            boxShadow: '2px 2px 0 var(--fn-shadow)', border: '2px solid var(--fn-line)',
          }}><Zap size={16} fill="currentColor" /></span>
          ADHDSat
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FieldToggle />
          <button onClick={() => setAuthOpen(true)} className="fn-chip">Sign in</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', padding: '36px clamp(20px, 5vw, 56px) 60px', maxWidth: 1120, margin: '0 auto', zIndex: 1 }}>
        <div className="fn-grid">
          <div>
            <div className="fn-reveal fn-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--fn-teal)' }} />
              1,000+ original questions · built for ADHD focus
            </div>
            <h1 className="fn-display fn-reveal" style={{
              fontSize: 'clamp(2.5rem, 5.6vw, 4.1rem)', lineHeight: 1.0, fontWeight: 800,
              marginBottom: 22, animationDelay: '.05s',
            }}>
              SAT prep that works with your{' '}
              <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                brain
                <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"
                  style={{ position: 'absolute', left: '-2%', bottom: '-0.26em', width: '104%', height: '0.36em' }}>
                  <path d="M3 13 C 50 4, 150 4, 197 11" stroke="var(--fn-terra)" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>, not against it.
            </h1>
            <p className="fn-reveal" style={{
              fontSize: '1.15rem', color: 'var(--fn-ink60)', lineHeight: 1.55,
              maxWidth: 480, marginBottom: 30, animationDelay: '.12s',
            }}>
              Short adaptive sprints. Instant feedback. Points for every win.
              The friction-free way to actually start studying and keep your streak alive.
            </p>
            <div className="fn-reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', animationDelay: '.18s' }}>
              <button className="fn-btn" onClick={onGuest}>Start free <ArrowRight size={18} /></button>
              <button onClick={() => setAuthOpen(true)} style={{
                background: 'transparent', border: 'none', color: 'var(--fn-ink)', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif",
                textDecoration: 'underline', textDecorationColor: 'var(--fn-teal)', textUnderlineOffset: 4, textDecorationThickness: 2,
              }}>I have an account</button>
            </div>
            <p className="fn-reveal" style={{ marginTop: 18, fontSize: '0.9rem', color: 'var(--fn-ink60)', animationDelay: '.24s' }}>
              No credit card. No setup. Your first sprint is 60 seconds away.
            </p>
          </div>
          <div className="fn-reveal" style={{ animationDelay: '.16s' }}>
            <SprintPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '24px clamp(20px, 5vw, 56px) 40px', maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 className="fn-display" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', fontWeight: 800, marginBottom: 10 }}>
          Designed around how focus actually works
        </h2>
        <p style={{ color: 'var(--fn-ink60)', maxWidth: 560, marginBottom: 38, lineHeight: 1.55, fontSize: '1.05rem' }}>
          Every feature exists to lower the cost of starting and raise the reward of finishing.
        </p>
        <div className="fn-features">
          {FEATURES.map(({ icon: Icon, title, body, tint }) => (
            <div key={title} className="fn-fc">
              <div className="fn-ictile" style={{ background: tintColor(tint) }}>
                <Icon size={20} color="#FBF7F0" />
              </div>
              <h3 className="fn-display" style={{ fontSize: '1.18rem', fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ color: 'var(--fn-ink60)', fontSize: '0.94rem', lineHeight: 1.5 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard peek — stat stickers */}
      <section style={{ padding: 'clamp(40px, 6vw, 70px) clamp(20px, 5vw, 56px) 20px', maxWidth: 1120, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h2 className="fn-display" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.3rem)', fontWeight: 800, marginBottom: 8 }}>
          Your wins, stacking up
        </h2>
        <p className="fn-hand" style={{ color: 'var(--fn-teal)', fontSize: '1.45rem', marginBottom: 34 }}>
          every sprint counts!
        </p>
        <div className="fn-stats">
          {STATS.map((s) => (
            <div key={s.l} className="fn-stat" style={{ background: s.bg, color: s.fg }}>
              <div className="fn-display" style={{ fontWeight: 800, fontSize: '3.2rem', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: 8, opacity: 0.95 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ padding: 'clamp(44px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="fn-org-a" style={{
          background: 'var(--fn-terra)', border: '2px solid var(--fn-line)', boxShadow: '6px 6px 0 var(--fn-shadow)',
          padding: 'clamp(36px, 6vw, 60px)', textAlign: 'center', color: '#FBF7F0',
        }}>
          <h2 className="fn-display" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)', fontWeight: 800, marginBottom: 14 }}>
            Your next score starts with one sprint.
          </h2>
          <p style={{ fontSize: '1.08rem', maxWidth: 500, margin: '0 auto 30px', lineHeight: 1.55, opacity: 0.92 }}>
            Free to start. Upgrade to Pro for unlimited sprints, full practice tests, and AI insights whenever you are ready.
          </p>
          <button onClick={onGuest} style={{
            background: '#FBF7F0', color: '#2A2622', fontWeight: 800, fontSize: '1.05rem',
            padding: '15px 34px', border: '2px solid var(--fn-line)', borderRadius: '14px 11px 13px 10px',
            boxShadow: '4px 4px 0 var(--fn-shadow)', cursor: 'pointer',
            fontFamily: "'Bricolage Grotesque', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 9,
          }}>
            Start free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer style={{
        padding: '28px clamp(20px, 5vw, 56px)', borderTop: '2px solid var(--fn-line)',
        display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between',
        color: 'var(--fn-ink60)', fontSize: '0.88rem', position: 'relative', zIndex: 1,
      }}>
        <span className="fn-display" style={{ fontWeight: 800, color: 'var(--fn-ink)', fontSize: '1.05rem' }}>ADHDSat</span>
        <span>Built for the way your brain works. © 2026</span>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onGuest={onGuest} />}
    </div>
  );
}
