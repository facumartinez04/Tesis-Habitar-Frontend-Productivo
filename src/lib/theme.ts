export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'habitar-theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch (e) {
    // LocalStorage might be disabled or restricted
  }
  return 'system';
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getResolvedTheme(mode?: ThemeMode): 'light' | 'dark' {
  const currentMode = mode || getStoredTheme();
  if (currentMode === 'dark') return 'dark';
  if (currentMode === 'light') return 'light';
  return getSystemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    // Ignore storage errors
  }

  const resolved = getResolvedTheme(mode);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  root.setAttribute('data-theme-preference', mode);

  // Dispatch event for any reactive component listeners
  window.dispatchEvent(
    new CustomEvent('habitar-theme-change', {
      detail: { mode, resolved },
    })
  );
}

export function initThemeListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
  } else {
    mediaQuery.addListener(handler);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.removeListener(handler);
    }
  };
}
