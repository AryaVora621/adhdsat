import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'adhdsat-theme';

// Resolve the initial theme: explicit user choice wins, else follow the OS.
function initialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Apply at module load so there is no flash of the wrong theme before React mounts.
export function applyStoredTheme() {
  document.documentElement.dataset.theme = initialTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || initialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  return { theme, setTheme, toggle };
}
