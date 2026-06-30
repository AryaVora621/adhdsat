import React, { useState } from 'react';
import { ArrowRight, Mail, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

/**
 * Email magic-link + Google sign-in modal. Used on the landing page and from the
 * in-app Profile so a guest can claim their progress without leaving the app.
 *
 * Props:
 *   onClose()      - dismiss the modal
 *   onGuest?()     - optional "continue as guest" path (landing only)
 *   title, blurb   - optional copy overrides (e.g. guest upgrade vs returning user)
 */
export default function AuthModal({ onClose, onGuest, title, blurb }) {
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
            <div style={{ display: 'inline-flex', padding: 16, borderRadius: 16, background: 'rgba(232, 100, 60,0.1)', marginBottom: 16 }}>
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
            <h2 style={{ fontSize: '1.5rem', marginBottom: 6, color: 'var(--text-primary)' }}>{title || 'Welcome back'}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: '0.95rem' }}>
              {blurb || 'Sign in to sync your streak, XP, and progress across every device.'}
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

            {onGuest && (
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                New here?{' '}
                <button onClick={() => { onClose(); onGuest(); }} style={{
                  background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, padding: 0,
                }}>Start free, no account</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
