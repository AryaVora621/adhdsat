import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flame, Star, LayoutDashboard, Zap, User, BookOpen } from 'lucide-react';

export default function Sidebar({ user }) {
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
      width: '240px', minWidth: '240px', backgroundColor: 'var(--bg-sidebar)', borderLeft: '1px solid #2a2a46',
      padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: '18px'
    }}>
      <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px', paddingLeft: '4px' }}>
        ADHDSat
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <NavLink to="/" end style={navLinkStyle}><LayoutDashboard size={16} /> Dashboard</NavLink>
        <NavLink to="/sprint" style={navLinkStyle}><Zap size={16} /> Sprint</NavLink>
        <NavLink to="/review" style={navLinkStyle}><BookOpen size={16} /> Review</NavLink>
        <NavLink to="/profile" style={navLinkStyle}><User size={16} /> Profile</NavLink>
      </nav>

      {/* XP card */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid #2a2a46' }}>
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
        <div style={{ height: '5px', backgroundColor: '#0f0f1a', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(xpProgress, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Streak */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #2a2a46' }}>
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
    </div>
  );
}
