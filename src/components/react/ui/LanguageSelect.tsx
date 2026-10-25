import { LOCALES, setChosenLocale, t, useI18n, type Locale } from '../../../i18n';
import { updateMyLanguage } from '../../../services/authService';
import { sessionStore } from '../../../store/sessionStore';

interface LanguageSelectProps {
  className?: string;
  tone?: 'default' | 'light';
}

export function LanguageSelect({ className = '', tone = 'default' }: LanguageSelectProps) {
  const { locale } = useI18n();

  function choose(next: Locale) {
    if (next === locale) return;
    setChosenLocale(next);
    if (sessionStore.get()?.token) updateMyLanguage(next).catch(() => undefined);
  }

  const base =
    tone === 'light'
      ? 'bg-white/80 border-gray-200 text-gray-600'
      : 'bg-white dark:bg-white/5 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300';

  return (
    <div
      role="group"
      aria-label={t('Idioma')}
      title={t('Idioma')}
      className={`inline-flex items-center rounded-lg border p-0.5 text-[11px] font-semibold ${base} ${className}`}
    >
      {LOCALES.map((option) => (
        <button
          key={option.id}
          type="button"
          lang={option.id}
          aria-pressed={locale === option.id}
          aria-label={option.label}
          onClick={() => choose(option.id)}
          className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
            locale === option.id ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
