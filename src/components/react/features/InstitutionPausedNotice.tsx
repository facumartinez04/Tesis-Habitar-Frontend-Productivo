import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useSession } from '../../../hooks/useSession';
import { logout } from '../../../services/authService';
import { intlLocale, t, useI18n } from '../../../i18n';

export function InstitutionPausedNotice() {
  useI18n();
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pause = session?.institutionPaused;
  if (!mounted || !session || !pause || session.user.role === 'admin') return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" role="alertdialog" aria-modal="true" aria-labelledby="paused-title">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center">
          <Icon name="lock" size={22} />
        </div>
        <h2 id="paused-title" className="text-base font-bold text-text-pri">
          {t('La cuenta de tu institución está pausada')}
        </h2>
        <p className="text-[12.5px] text-text-sec mt-2 leading-relaxed">
          {t('Mientras esté pausada no se pueden usar los paneles ni las actividades. Comunicate con Habitar para reactivarla.')}
        </p>
        {pause.reason && (
          <div className="mt-3 text-left bg-surface rounded-lg px-3 py-2 text-[12px] text-text-pri">
            <span className="font-semibold">{t('Motivo:')}</span> {pause.reason}
          </div>
        )}
        <div className="text-[11px] text-text-ter mt-2">
          {t('Pausada el {date}', { date: new Date(pause.pausedAt).toLocaleDateString(intlLocale(), { dateStyle: 'long' }) })}
        </div>
        <button
          type="button"
          onClick={() => void logout().then(() => (window.location.href = '/login'))}
          className="mt-5 w-full bg-green-dark text-white text-[12.5px] font-semibold py-2.5 rounded-lg cursor-pointer"
        >
          {t('Cerrar sesión')}
        </button>
      </div>
    </div>
  );
}
