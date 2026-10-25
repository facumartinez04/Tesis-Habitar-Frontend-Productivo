import { useEffect, useState } from 'react';
import { t, useI18n } from '../../../i18n';
import { useSession } from '../../../hooks/useSession';
import { TOUR_START_EVENT } from './OnboardingTour';

function tourHome(role: string): string | null {
  if (role === 'docente') return '/docente/cursos';
  if (role === 'coordinador' || role === 'director') return '/institucional';
  return null;
}

export function TourButton() {
  useI18n();
  const session = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const home = mounted && session ? tourHome(session.user.role) : null;
  if (!home || session?.impersonatedRole) return null;

  function launch() {
    if (window.__habitarTour) window.dispatchEvent(new Event(TOUR_START_EVENT));
    else window.location.href = `${home}?tour=1`;
  }

  return (
    <button
      type="button"
      onClick={launch}
      title={t('Ver el recorrido guiado de la plataforma')}
      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
    >
      <span aria-hidden="true" className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-current text-[9px] leading-none">?</span>
      {t('Recorrido')}
    </button>
  );
}
