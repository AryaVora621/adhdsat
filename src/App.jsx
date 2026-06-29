import React, { useState, useEffect, useRef, Component, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { supabase } from './lib/supabase';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '32px', textAlign: 'center', gap: '16px' }}>
          <Zap size={40} color="var(--primary)" />
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
            ADHDSat hit an unexpected error. Your progress is saved.
          </p>
          <button className="primary" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
            style={{ padding: '12px 28px' }}>
            Back to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import LevelUpToast from './components/LevelUpToast';

// Route-split the in-app pages so newcomers only download the landing shell
// first; the heavier authed screens load on demand. Import thunks are kept so
// the high-traffic routes can be prefetched during idle time (instant nav).
const load = {
  Dashboard: () => import('./pages/Dashboard'),
  Sprint: () => import('./pages/Sprint'),
  Onboarding: () => import('./pages/Onboarding'),
  Profile: () => import('./pages/Profile'),
  ReviewSprint: () => import('./pages/ReviewSprint'),
  PracticeTest: () => import('./pages/PracticeTest'),
  Upgrade: () => import('./pages/Upgrade'),
};
const Dashboard = lazy(load.Dashboard);
const Sprint = lazy(load.Sprint);
const Onboarding = lazy(load.Onboarding);
const Profile = lazy(load.Profile);
const ReviewSprint = lazy(load.ReviewSprint);
const PracticeTest = lazy(load.PracticeTest);
const Upgrade = lazy(load.Upgrade);
import './index.css';

const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
};

const getLevel = (xp) => Math.floor((xp || 0) / 500) + 1;

function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Task routes are focus modes: hide the mobile bottom nav so the question has
  // the full screen (and the primary action buttons never sit under the nav).
  const focusRoute = ['/sprint', '/review', '/practice-test'].includes(location.pathname);

  const setUserWithLevelCheck = (newUser) => {
    setUser(prev => {
      if (prev && newUser && getLevel(newUser.total_xp) > getLevel(prev.total_xp)) {
        setLevelUpToast(getLevel(newUser.total_xp));
      }
      return newUser;
    });
  };

  // Tracks the last identity we resolved so repeated auth events (INITIAL_SESSION,
  // TOKEN_REFRESHED) don't re-run navigation or re-claim.
  const resolvedKey = useRef(null);

  // Load (or migrate) the backend user row for an authenticated Supabase session.
  const claimAuthUser = (session) => {
    const guestId = localStorage.getItem('userId');
    return fetch('/api/users/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId: session.user.id, email: session.user.email, guestId }),
    })
      .then(res => { if (!res.ok) throw new Error(`claim ${res.status}`); return res.json(); })
      .then(data => {
        if (!data || !data.id) throw new Error('invalid user payload');
        localStorage.setItem('userId', data.id);
        setUserWithLevelCheck(data);
        setLoading(false);
        if (!data.onboarding_completed) navigate('/onboarding');
      })
      .catch(() => { setApiError(true); setLoading(false); });
  };

  // Load an existing anonymous guest (returning visitor with a stored id).
  const loadGuest = (userId) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, display_name: 'Learner' }),
    })
      .then(res => { if (!res.ok) throw new Error(`users ${res.status}`); return res.json(); })
      .then(data => {
        if (!data || !data.id) throw new Error('invalid user payload');
        setUserWithLevelCheck(data);
        setLoading(false);
        if (!data.onboarding_completed) navigate('/onboarding');
      })
      .catch(() => { setApiError(true); setLoading(false); });

  // Create a fresh guest account on demand (the Landing "Start free" CTA).
  const createGuest = () => {
    const id = crypto.randomUUID();
    localStorage.setItem('userId', id);
    setLoading(true);
    loadGuest(id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userId');
    resolvedKey.current = null;
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    // Supabase fires onAuthStateChange immediately with INITIAL_SESSION, so this
    // single listener covers both first load and later sign-in / sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const key = session?.user?.id || 'anon';
      if (key === resolvedKey.current) return; // ignore duplicate/token-refresh events
      resolvedKey.current = key;

      if (session?.user) {
        setLoading(true);
        claimAuthUser(session);
      } else {
        // No session: returning guest keeps their progress; true newcomers see Landing.
        const guestId = localStorage.getItem('userId');
        if (guestId) loadGuest(guestId);
        else { setUser(null); setLoading(false); }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Once the user is in the app, warm the chunks they're most likely to open next
  // during idle time, so navigating from the dashboard feels instant. import()
  // results are cached by the browser, so React.lazy resolves immediately later.
  useEffect(() => {
    if (!user?.onboarding_completed) return;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 800));
    const handle = idle(() => {
      load.Sprint();
      load.ReviewSprint();
      load.PracticeTest();
      load.Profile();
    });
    return () => (window.cancelIdleCallback || clearTimeout)(handle);
  }, [user?.onboarding_completed]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>ADHDSat</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', flexDirection: 'column', gap: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>ADHDSat</div>
        <div style={{ color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: 1.6 }}>
          Could not connect to the server. Check your connection and try again.
        </div>
        <button className="primary" onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '12px 28px' }}>
          Retry
        </button>
      </div>
    );
  }

  // Brand-new visitor (no session, no stored guest): show the marketing landing.
  if (!user) {
    return <Landing onGuest={createGuest} />;
  }

  const showNav = user?.onboarding_completed;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: isMobile && showNav && !focusRoute ? '64px' : 0 }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '60vh' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        }>
          <Routes>
            <Route path="/onboarding" element={<Onboarding user={user} setUser={setUserWithLevelCheck} />} />
            <Route path="/" element={user?.onboarding_completed ? <Dashboard user={user} isMobile={isMobile} /> : <Navigate to="/onboarding" />} />
            <Route path="/sprint" element={user?.onboarding_completed ? <Sprint user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
            <Route path="/profile" element={user?.onboarding_completed ? <Profile user={user} setUser={setUserWithLevelCheck} onSignOut={signOut} /> : <Navigate to="/onboarding" />} />
            <Route path="/review" element={user?.onboarding_completed ? <ReviewSprint user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
            <Route path="/practice-test" element={user?.onboarding_completed ? <PracticeTest user={user} /> : <Navigate to="/onboarding" />} />
            <Route path="/upgrade" element={user?.onboarding_completed ? <Upgrade user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </div>
      {showNav && !isMobile && <Sidebar user={user} onSignOut={signOut} />}
      {showNav && isMobile && !focusRoute && <BottomNav userId={user?.id} />}
      {levelUpToast && <LevelUpToast level={levelUpToast} onDone={() => setLevelUpToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
