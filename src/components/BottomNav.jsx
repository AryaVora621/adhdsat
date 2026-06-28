import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap, BookOpen, User } from 'lucide-react';

export default function BottomNav() {
  const linkStyle = ({ isActive }) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    textDecoration: 'none', padding: '8px 16px', flex: 1,
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    fontSize: '0.65rem', letterSpacing: '0.5px', fontWeight: isActive ? '600' : '400',
    transition: 'color 0.15s',
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
      <NavLink to="/review" style={linkStyle}><BookOpen size={20} />Review</NavLink>
      <NavLink to="/profile" style={linkStyle}><User size={20} />Profile</NavLink>
    </nav>
  );
}
