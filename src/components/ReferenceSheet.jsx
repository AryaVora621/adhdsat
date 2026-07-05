import React from 'react';
import { X } from 'lucide-react';
import MathText from './MathText';

const FORMULAS = [
  { label: 'Circle area', formula: 'A = \\pi r^2' },
  { label: 'Circle circumference', formula: 'C = 2\\pi r' },
  { label: 'Triangle area', formula: 'A = \\frac{1}{2} b h' },
  { label: 'Pythagorean theorem', formula: 'a^2 + b^2 = c^2' },
  { label: 'Slope', formula: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
  { label: 'Slope-intercept form', formula: 'y = mx + b' },
  { label: 'Quadratic formula', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Volume of a rectangular prism', formula: 'V = lwh' },
  { label: 'Volume of a cylinder', formula: 'V = \\pi r^2 h' },
  { label: 'Volume of a sphere', formula: 'V = \\frac{4}{3} \\pi r^3' },
  { label: 'Sum of interior angles (n-gon)', formula: '(n - 2) \\times 180' },
  { label: 'Special right triangle (45-45-90)', formula: 'x, x, x\\sqrt{2}' },
  { label: 'Special right triangle (30-60-90)', formula: 'x, x\\sqrt{3}, 2x' },
];

// Static SAT math reference sheet, matching the formulas printed on the real
// Bluebook reference screen. No external dependency (unlike the calculator).
export default function ReferenceSheet({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(5,8,18,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '28px', position: 'relative',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, padding: 6, borderRadius: 8,
          background: 'transparent', border: 'none', color: 'var(--text-secondary)',
        }}><X size={18} /></button>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 18, color: 'var(--text-primary)' }}>Reference Sheet</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
          {FORMULAS.map((f) => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{f.label}</span>
              <MathText style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{`$${f.formula}$`}</MathText>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
