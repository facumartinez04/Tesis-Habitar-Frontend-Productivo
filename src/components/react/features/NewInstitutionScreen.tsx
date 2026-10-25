import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { ensureAdminSession } from '../../../services/authService';
import { createInstitution } from '../../../services/institutionService';
import type { EducationLevel, InstitutionStatus } from '../../../types/institution';
import { t, useI18n } from '../../../i18n';

export function NewInstitutionScreen() {
  useI18n();
  const { message, showToast } = useToast();
  const [name, setName] = useState('Colegio San Martín');
  const [domain, setDomain] = useState('');
  const [levels, setLevels] = useState<EducationLevel[]>(['primario', 'secundario']);
  const [status, setStatus] = useState<InstitutionStatus>('activo');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureAdminSession();
  }, []);

  function toggleLevel(level: EducationLevel) {
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  const isValid = name.trim() && domain.trim() && coordinatorEmail.trim() && levels.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    await createInstitution({ name, domain, levels, status, coordinatorEmail });
    setSubmitting(false);
    showToast(
      status === 'activo'
        ? t('Institución creada y activa: los usuarios con ese dominio ya pueden iniciar sesión')
        : t('Institución creada como piloto — activala desde "Instituciones" cuando esté lista'),
    );
    setDomain('');
    setCoordinatorEmail('');
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] bg-white dark:bg-[#131620] text-text-pri placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all';
  const labelClass = 'block text-[11.5px] text-gray-500 dark:text-gray-400 mb-1.5 font-semibold uppercase tracking-wide';

  return (
    <div className="max-w-2xl">
      <Toast message={message} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('Alta de institución')}</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{t('Aprovisioná un nuevo tenant en la plataforma')}</p>
      </div>

      <div className="bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('Nombre de la institución')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('Dominio institucional')}</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t('@colegio.edu.ar')}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('Niveles educativos')}</label>
            <div className="flex flex-col gap-2.5 pt-1">
              <label className="flex items-center gap-2.5 text-[13px] text-gray-700 dark:text-gray-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={levels.includes('primario')}
                  onChange={() => toggleLevel('primario')}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer"
                />
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('Primario')}</span>
              </label>
              <label className="flex items-center gap-2.5 text-[13px] text-gray-700 dark:text-gray-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={levels.includes('secundario')}
                  onChange={() => toggleLevel('secundario')}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer"
                />
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('Secundario')}</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('Estado inicial')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InstitutionStatus)}
              className={`form-select ${inputClass}`}
            >
              <option value="activo">{t('Activo')}</option>
              <option value="piloto_no_confirmado">{t('Piloto no confirmado')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('Email del/la coordinador/a')}</label>
          <input
            value={coordinatorEmail}
            onChange={(e) => setCoordinatorEmail(e.target.value)}
            placeholder={t('coordinador@colegio.edu.ar')}
            className={inputClass}
          />
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-4 py-3 text-[13px] text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
          <Icon name="mail" size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t('Habitar usa una única app de Google/Microsoft para toda la plataforma: si la institución queda "Activa", cualquier cuenta con ese dominio ya puede iniciar sesión, sin pasos adicionales para el/la coordinador/a.')}</span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => { setName(''); setDomain(''); setCoordinatorEmail(''); }}
            className="px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252B3B] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D3342] transition-colors cursor-pointer"
          >
            {t('Cancelar')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0F6E56] hover:bg-[#0A5A46] rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? t('Creando…') : t('Crear institución')}
          </button>
        </div>
      </div>
    </div>
  );
}
