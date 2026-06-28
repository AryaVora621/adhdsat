import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Sprint from './pages/Sprint';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import './index.css';

function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        setUser(data);
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

  const showSidebar = user?.onboarding_completed;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding user={user} setUser={setUser} />} />
          <Route path="/" element={user?.onboarding_completed ? <Dashboard user={user} /> : <Navigate to="/onboarding" />} />
          <Route path="/sprint" element={user?.onboarding_completed ? <Sprint user={user} setUser={setUser} /> : <Navigate to="/onboarding" />} />
          <Route path="/profile" element={user?.onboarding_completed ? <Profile user={user} setUser={setUser} /> : <Navigate to="/onboarding" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showSidebar && <Sidebar user={user} />}
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
