import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Flame, Star, LayoutDashboard, Zap, User, BookOpen, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../lib/theme';

function WeekCalendar({ userId }) {
  const [activeDays, setActiveDays] = useState(new Set());

  useEffect(() => {
    fetch(`/api/activity-days/${userId}`)
      .then(r => r.json())
      .then(days => setActiveDays(new Set(days)))
      .catch(() => {});
  }, [userId]);

  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    days.push({ key, label, active: activeDays.has(key) });
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>This Week</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {days.map(d => (
          <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '6px',
              backgroundColor: d.active ? 'var(--primary)' : 'var(--bg-main)',
              border: `1px solid ${d.active ? 'var(--primary)' : 'var(--border)'}`,
              opacity: d.key === new Date().toISOString().slice(0, 10) && !d.active ? 0.5 : 1,
            }} />
            <span style={{ fontSize: '0.6rem', color: d.active ? 'var(--primary)' : 'var(--text-secondary)' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ user, onSignOut }) {
  const location = useLocation();
  const [reviewCount, setReviewCount] = useState(0);
  const { theme, toggle } = useTheme();
  const dark = theme !== 'light';

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/review/count?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setReviewCount(data?.count || 0))
      .catch(() => {});
  }, [user?.id, location.pathname]);

  const level = Math.floor(user.total_xp / 500) + 1;
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNextLevel = level * 500;
  const xpProgress = ((user.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px',
    textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.15s', cursor: 'pointer',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
    border: isActive ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
    fontWeight: isActive ? '500' : '400'
  });

  return (
    <div style={{
      width: '240px', minWidth: '240px', backgroundColor: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
      padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: '18px'
    }}>
      <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px', paddingLeft: '4px' }}>
        ADHDSat
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <NavLink to="/" end style={navLinkStyle}><LayoutDashboard size={16} /> Dashboard</NavLink>
        <NavLink to="/sprint" style={navLinkStyle}><Zap size={16} /> Sprint</NavLink>
        <NavLink to="/review" style={navLinkStyle}>
          <BookOpen size={16} />
          Review
          {reviewCount > 0 && (
            <span style={{ marginLeft: 'auto', backgroundColor: 'var(--error)', color: '#fff', fontSize: '0.6rem', fontWeight: '700', borderRadius: '10px', padding: '1px 6px', minWidth: '16px', textAlign: 'center' }}>
              {reviewCount > 9 ? '9+' : reviewCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/profile" style={navLinkStyle}><User size={16} /> Profile</NavLink>
      </nav>

      {/* XP card */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '2px' }}>
              {user.display_name && user.display_name !== 'Learner' ? user.display_name : 'Learner'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Level {level}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--xp-gold)', fontWeight: '600', fontSize: '0.85rem' }}>
            <Star size={14} fill="currentColor" /> {user.total_xp}
          </div>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{user.total_xp - xpForCurrentLevel} XP</span>
          <span>{xpForNextLevel - xpForCurrentLevel} to Lv {level + 1}</span>
        </div>
        <div style={{ height: '5px', backgroundColor: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(xpProgress, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Streak */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border)' }}>
        <Flame size={24} color="var(--error)" fill="var(--error)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1 }}>{user.current_streak}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '2px' }}>Day Streak</div>
        </div>
        {user.longest_streak > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{user.longest_streak}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>Best</div>
          </div>
        )}
      </div>

      {/* 7-day activity calendar */}
      <WeekCalendar userId={user.id} />

      {/* Footer: theme + account */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={toggle} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', borderRadius: '10px',
          background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
          fontSize: '0.85rem', fontWeight: 500,
        }}>
          {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light mode' : 'Dark mode'}
        </button>
        {onSignOut && user.email && (
          <button onClick={onSignOut} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', borderRadius: '10px',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            fontSize: '0.85rem', fontWeight: 500,
          }}>
            <LogOut size={16} /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
