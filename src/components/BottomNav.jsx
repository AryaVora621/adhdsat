import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap, BookOpen, User } from 'lucide-react';

export default function BottomNav({ userId }) {
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/review/count?userId=${userId}`)
      .then(r => r.json())
      .then(data => setReviewCount(data?.count || 0))
      .catch(() => {});
  }, [userId]);

  const linkStyle = ({ isActive }) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    textDecoration: 'none', padding: '8px 16px', flex: 1,
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    fontSize: '0.65rem', letterSpacing: '0.5px', fontWeight: isActive ? '600' : '400',
    transition: 'color 0.15s', position: 'relative',
  });

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      backgroundColor: 'var(--bg-sidebar)', borderTop: '1px solid #2a2a46',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <NavLink to="/" end style={linkStyle}><LayoutDashboard size={20} />Home</NavLink>
      <NavLink to="/sprint" style={linkStyle}><Zap size={20} />Sprint</NavLink>
      <NavLink to="/review" style={linkStyle}>
        <div style={{ position: 'relative' }}>
          <BookOpen size={20} />
          {reviewCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-6px',
              backgroundColor: 'var(--error)', color: '#fff',
              fontSize: '0.55rem', fontWeight: '700', borderRadius: '10px',
              padding: '1px 4px', minWidth: '14px', textAlign: 'center', lineHeight: '14px',
            }}>{reviewCount > 9 ? '9+' : reviewCount}</span>
          )}
        </div>
        Review
      </NavLink>
      <NavLink to="/profile" style={linkStyle}><User size={20} />Profile</NavLink>
    </nav>
  );
}
