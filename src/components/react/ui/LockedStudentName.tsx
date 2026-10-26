import { Icon } from './Icon';
import { t, useI18n } from '../../../i18n';

export function LockedStudentName({ name }: { name: string }) {
  useI18n();
  const display = /^\d{1,3}$/.test(name) ? t('N.º {number}', { number: name }) : name;
  return (
    <div className="mb-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        <Icon name="lock" size={12} />
        {t('Vas a entrar como')}
      </div>
      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 break-words">{display}</div>
      <p className="text-[11.5px] text-stone-600 dark:text-stone-300 mt-1 leading-snug">
        {t('Este dispositivo quedó registrado con tu nombre y no se puede cambiar. Si no sos vos, avisale a tu docente.')}
      </p>
    </div>
  );
}
