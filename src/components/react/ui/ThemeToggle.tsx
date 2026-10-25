import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { applyTheme, getStoredTheme, getResolvedTheme, type ThemeMode } from '../../../lib/theme';
import { t, useI18n } from '../../../i18n';

interface ThemeToggleProps {
  variant?: 'segmented' | 'compact';
  className?: string;
}

export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  useI18n();
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

  if (!mounted) {
    return (
      <div className={`h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${className}`} />
    );
  }

  if (variant === 'compact') {
    const nextModeMap: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };

    const iconName = currentMode === 'system' ? 'monitor' : currentMode === 'dark' ? 'moon' : 'sun';
    const label = currentMode === 'system' ? t('Tema: Sistema') : currentMode === 'dark' ? t('Tema: Oscuro') : t('Tema: Claro');

    return (
      <button
        type="button"
        onClick={() => handleSelect(nextModeMap[currentMode])}
        title={t('{label} (Click para cambiar)', { label })}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1E29] hover:bg-gray-50 dark:hover:bg-[#252B3B] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer ${className}`}
      >
        <Icon name={iconName} size={14} className={resolved === 'dark' ? 'text-amber-400' : 'text-emerald-600'} />
        <span className="hidden sm:inline capitalize">{currentMode}</span>
      </button>
    );
  }

  const modes: { mode: ThemeMode; icon: 'sun' | 'moon' | 'monitor'; label: string }[] = [
    { mode: 'light', icon: 'sun', label: t('Claro') },
    { mode: 'dark', icon: 'moon', label: t('Oscuro') },
    { mode: 'system', icon: 'monitor', label: t('Sistema') },
  ];

  return (
    <div
      role="group"
      aria-label={t('Seleccionar tema visual')}
      className={`inline-flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {modes.map(({ mode, icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => handleSelect(mode)}
          aria-pressed={currentMode === mode}
          title={t('Modo {toLowerCase}', { toLowerCase: label.toLowerCase() })}
          className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
            currentMode === mode
              ? 'bg-white dark:bg-[#252B3B] text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Icon name={icon} size={14} />
          <span className="hidden md:inline ml-1.5 text-[11.5px]">{label}</span>
        </button>
      ))}
    </div>
  );
}
