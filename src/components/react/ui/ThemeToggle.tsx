import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { applyTheme, getStoredTheme, getResolvedTheme, type ThemeMode } from '../../../lib/theme';

interface ThemeToggleProps {
  variant?: 'segmented' | 'compact';
  className?: string;
}

export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const [currentMode, setCurrentMode] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentMode(getStoredTheme());
    setResolved(getResolvedTheme());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: ThemeMode; resolved: 'light' | 'dark' }>;
      if (customEvent.detail) {
        setCurrentMode(customEvent.detail.mode);
        setResolved(customEvent.detail.resolved);
      } else {
        setCurrentMode(getStoredTheme());
        setResolved(getResolvedTheme());
      }
    };

    window.addEventListener('habitar-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('habitar-theme-change', handleThemeChange);
    };
  }, []);

  const handleSelect = (mode: ThemeMode) => {
    setCurrentMode(mode);
    applyTheme(mode);
  };

  // Render placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <div className={`h-8 w-24 bg-gray-bg/60 rounded-lg animate-pulse ${className}`} />
    );
  }

  if (variant === 'compact') {
    // Quick toggle cycling: light -> dark -> system
    const nextModeMap: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };

    const iconName = currentMode === 'system' ? 'monitor' : currentMode === 'dark' ? 'moon' : 'sun';
    const label = currentMode === 'system' ? 'Tema: Sistema' : currentMode === 'dark' ? 'Tema: Oscuro' : 'Tema: Claro';

    return (
      <button
        type="button"
        onClick={() => handleSelect(nextModeMap[currentMode])}
        title={`${label} (Click para cambiar)`}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-border bg-surface hover:bg-gray-bg text-text-pri transition-colors ${className}`}
      >
        <Icon name={iconName} size={14} className={resolved === 'dark' ? 'text-amber-400' : 'text-emerald-700'} />
        <span className="hidden sm:inline capitalize">{currentMode}</span>
      </button>
    );
  }

  // Segmented control with 3 distinct options
  return (
    <div
      role="group"
      aria-label="Seleccionar tema visual"
      className={`inline-flex items-center p-0.5 rounded-lg bg-surface border border-gray-border shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => handleSelect('light')}
        aria-pressed={currentMode === 'light'}
        title="Modo claro"
        className={`flex items-center justify-center p-1.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium transition-all duration-150 ${
          currentMode === 'light'
            ? 'bg-white text-emerald-700 shadow-xs font-semibold'
            : 'text-text-sec hover:text-text-pri hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <Icon name="sun" size={14} />
        <span className="hidden md:inline ml-1.5 text-[11.5px]">Claro</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('dark')}
        aria-pressed={currentMode === 'dark'}
        title="Modo oscuro"
        className={`flex items-center justify-center p-1.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium transition-all duration-150 ${
          currentMode === 'dark'
            ? 'bg-white dark:bg-zinc-800 text-emerald-400 dark:text-emerald-400 shadow-xs font-semibold'
            : 'text-text-sec hover:text-text-pri hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <Icon name="moon" size={14} />
        <span className="hidden md:inline ml-1.5 text-[11.5px]">Oscuro</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('system')}
        aria-pressed={currentMode === 'system'}
        title="Automático (se adapta al sistema)"
        className={`flex items-center justify-center p-1.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium transition-all duration-150 ${
          currentMode === 'system'
            ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
            : 'text-text-sec hover:text-text-pri hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <Icon name="monitor" size={14} />
        <span className="hidden md:inline ml-1.5 text-[11.5px]">Sistema</span>
      </button>
    </div>
  );
}
