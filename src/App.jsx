import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Sprint from './pages/Sprint';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import ReviewSprint from './pages/ReviewSprint';
import LevelUpToast from './components/LevelUpToast';
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
  const [levelUpToast, setLevelUpToast] = useState(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const setUserWithLevelCheck = (newUser) => {
    setUser(prev => {
      if (prev && newUser && getLevel(newUser.total_xp) > getLevel(prev.total_xp)) {
        setLevelUpToast(getLevel(newUser.total_xp));
      }
      return newUser;
    });
  };

  useEffect(() => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('userId', userId);
    }

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, display_name: 'Learner' })
    })
      .then(res => res.json())
      .then(data => {
        setUserWithLevelCheck(data);
        setLoading(false);
        if (!data.onboarding_completed) {
          navigate('/onboarding');
        }
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>ADHDSat</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</div>
      </div>
    );
  }

  const showNav = user?.onboarding_completed;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: isMobile && showNav ? '64px' : 0 }}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding user={user} setUser={setUserWithLevelCheck} />} />
          <Route path="/" element={user?.onboarding_completed ? <Dashboard user={user} isMobile={isMobile} /> : <Navigate to="/onboarding" />} />
          <Route path="/sprint" element={user?.onboarding_completed ? <Sprint user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
          <Route path="/profile" element={user?.onboarding_completed ? <Profile user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
          <Route path="/review" element={user?.onboarding_completed ? <ReviewSprint user={user} setUser={setUserWithLevelCheck} /> : <Navigate to="/onboarding" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showNav && !isMobile && <Sidebar user={user} />}
      {showNav && isMobile && <BottomNav />}
      {levelUpToast && <LevelUpToast level={levelUpToast} onDone={() => setLevelUpToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
