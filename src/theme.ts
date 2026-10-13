const KEY = 'av-theme';

export const isDark = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

export function setTheme(mode: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', mode);
  try { localStorage.setItem(KEY, mode); } catch { /* private mode */ }
}

export const toggleTheme = () => setTheme(isDark() ? 'light' : 'dark');
