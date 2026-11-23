import { useEffect, useState } from 'react';
import type { OAuthProviderId } from '../../../types/auth';
import {
  clearPendingLogin,
  getPendingLogin,
  oauthLoginUrl,
  retryPendingLogin,
  type PendingLogin,
} from '../../../services/authService';
import { getIntegrationsConfig } from '../../../services/integrationsService';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';
import { StudentQrScannerModal } from './StudentQrScannerModal';
import { Icon } from '../ui/Icon';
import { t, useI18n } from '../../../i18n';

const ERROR_MESSAGES: Record<string, string> = {
  institution_not_allowed: 'Tu institución no está habilitada en Habitar. Contactá a tu coordinador/a.',
  account_disabled: 'Tu cuenta fue desactivada. Contactá a tu coordinador/a.',
  invalid_tenant: 'Tu cuenta no pertenece a la organización de la institución registrada en Habitar.',
  guest_account: 'Las cuentas invitadas de Microsoft no pueden ingresar a Habitar.',
  unauthorized: 'No se pudo validar la sesión con el proveedor de login.',
  auth_failed: 'Ocurrió un error al intentar iniciar sesión. Por favor, intentá nuevamente.',
  session_expired: 'La sesión de login expiró, intentá de nuevo.',
};

const PENDING_MESSAGES: Record<string, string> = {
  institution_not_allowed:
    'Tu cuenta todavía no está vinculada a ninguna institución en Habitar. Pedile a tu coordinador/a que te dé de alta con este correo.',
  account_disabled: 'Tu cuenta fue desactivada. Pedile a tu coordinador/a que la vuelva a activar.',
};

export function LoginScreen() {
  useI18n();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState<PendingLogin | null>(null);
  const [pendingCode, setPendingCode] = useState('institution_not_allowed');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    getIntegrationsConfig()
      .then((config) => setMicrosoftEnabled(Boolean(config.oneDrive)))
      .catch(() => setMicrosoftEnabled(null));
  }, []);

  useEffect(() => {
    const rawError = new URLSearchParams(window.location.search).get('error');
    if (rawError && rawError !== 'choose_institution') {
      if (PENDING_MESSAGES[rawError]) setPendingCode(rawError);
      setError(t(ERROR_MESSAGES[rawError]) || rawError);
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {}
    }
    getPendingLogin().then((found) => {
      if (!found) return;
      setPending(found);
      setError(null);
    });
  }, []);

  async function handleRetry() {
    setRetrying(true);
    setPendingMessage(null);
    const result = await retryPendingLogin();
    if (result.ok) {
      window.location.href = result.dashboardPath;
      return;
    }
    setRetrying(false);
    if (PENDING_MESSAGES[result.code]) {
      setPendingCode(result.code);
      setPendingMessage(t('Todavía no tenés acceso. Probá de nuevo cuando tu coordinador/a te haya dado de alta.'));
      return;
    }
    setPending(null);
    setError(t(ERROR_MESSAGES[result.code]) || result.message);
  }

  async function handleChoose(institutionId: string) {
    setRetrying(true);
    setPendingMessage(null);
    const result = await retryPendingLogin(institutionId);
    if (result.ok) {
      window.location.href = result.dashboardPath;
      return;
    }
    setRetrying(false);
    setPendingMessage(result.message);
  }

  async function handleOtherAccount() {
    await clearPendingLogin();
    setPending(null);
    setPendingMessage(null);
  }

  function handleLogin(provider: OAuthProviderId) {
    setLoadingProvider(provider);
    window.location.href = oauthLoginUrl(provider);
  }

  function handleSoyAlumno() {
    try {
      localStorage.setItem('habitar_user_role', 'alumno');
    } catch {}
    window.location.href = '/actividad';
  }

  function handleCodeScanned(code: string, type: 'course' | 'activity') {
    try {
      localStorage.setItem('habitar_user_role', 'alumno');
    } catch {}
    if (type === 'course') {
      window.location.href = `/aula?code=${encodeURIComponent(code)}`;
    } else {
      window.location.href = `/actividad?code=${encodeURIComponent(code)}`;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 min-h-screen bg-[#FAF9F6] dark:bg-[#0D0F14] selection:bg-emerald-100 selection:text-emerald-950 font-sans antialiased">
      <div className="absolute top-1/3 w-80 h-80 bg-emerald-200/20 dark:bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/90 dark:border-stone-800 rounded-3xl p-7 sm:p-9 shadow-xl flex flex-col items-center text-center">
        <a href="/" className="mb-4 inline-block group" title={t('Ir al inicio de Habitar')}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#0A4D3C] text-white flex items-center justify-center p-2.5 shadow-md group-hover:scale-105 transition-transform">
            <img
              src="/logo-white.svg"
              alt="Habitar"
              className="w-full h-full object-contain"
            />
          </div>
        </a>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Habi<span className="text-emerald-700 dark:text-emerald-400">tar</span>
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-6 leading-relaxed font-medium">
          {t('Comprensión lectora y diagnóstico formativo para instituciones educativas')}
        </p>

        {error && (
          <div
            role="alert"
            className="w-full flex items-start gap-2 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-200 dark:text-rose-200 dark:bg-rose-500/15 dark:border-rose-400/40 rounded-2xl px-4 py-3 mb-5 text-left leading-snug shadow-2xs"
          >
            <Icon name="alert-circle" size={15} className="shrink-0 mt-px text-rose-600 dark:text-rose-300" />
            <span>{error}</span>
          </div>
        )}

        {pending && pending.choices.length > 1 ? (
          <div className="w-full text-left space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 w-8 h-8 rounded-full bg-white dark:bg-[#202533] border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                {pending.provider === 'microsoft' ? <MicrosoftIcon /> : <GoogleIcon />}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  {pending.provider === 'microsoft' ? t('Ingresaste con Microsoft como') : t('Ingresaste con Google como')}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{pending.name || pending.email}</div>
                {pending.name && <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{pending.email}</div>}
              </div>
            </div>
            <p role="status" className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
              {t('Tenés cuenta en más de una institución. Elegí a cuál querés entrar.')}
            </p>
            <div className="space-y-2">
              {pending.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => void handleChoose(choice.id)}
                  disabled={retrying}
                  className="flex items-center justify-between gap-3 w-full px-4 py-3.5 rounded-2xl border border-stone-300/80 dark:border-stone-700 bg-white dark:bg-[#202533] text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-[#282F40] transition-all shadow-xs disabled:opacity-60 cursor-pointer text-left"
                >
                  <span className="min-w-0 truncate">{choice.name}</span>
                  <Icon name="arrowRight" size={14} />
                </button>
              ))}
            </div>
            {pendingMessage && <p className="text-[11px] leading-relaxed text-red-700 dark:text-red-300">{pendingMessage}</p>}
            <button
              type="button"
              onClick={handleOtherAccount}
              disabled={retrying}
              className="w-full px-4 py-3 rounded-2xl border border-stone-300/80 dark:border-stone-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-stone-50 dark:hover:bg-[#282F40] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {t('Usar otra cuenta')}
            </button>
          </div>
        ) : pending ? (
          <div className="w-full text-left space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3.5 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 w-8 h-8 rounded-full bg-white dark:bg-[#202533] border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
                  {pending.provider === 'microsoft' ? <MicrosoftIcon /> : <GoogleIcon />}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                    {pending.provider === 'microsoft' ? t('Ingresaste con Microsoft como') : t('Ingresaste con Google como')}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{pending.name || pending.email}</div>
                  {pending.name && <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{pending.email}</div>}
                </div>
              </div>
              <p role="status" className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 font-medium">
                {t(PENDING_MESSAGES[pendingCode])}
              </p>
              {pendingMessage && <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">{pendingMessage}</p>}
            </div>

            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white dark:text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <Icon name="refresh" size={15} />
              <span>{retrying ? t('Validando…') : t('Volver a validar')}</span>
            </button>
            <button
              type="button"
              onClick={handleOtherAccount}
              disabled={retrying}
              className="w-full px-4 py-3 rounded-2xl border border-stone-300/80 dark:border-stone-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-stone-50 dark:hover:bg-[#282F40] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {t('Usar otra cuenta')}
            </button>
          </div>
        ) : (
        <div className="w-full space-y-3">
          <button
            disabled={loadingProvider !== null}
            onClick={() => handleLogin('google')}
            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 border border-stone-300/80 dark:border-stone-700 rounded-2xl bg-white dark:bg-[#202533] text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-[#282F40] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <GoogleIcon />
            <span>{loadingProvider === 'google' ? t('Conectando con Google…') : t('Continuar con Google Workspace')}</span>
          </button>

          {microsoftEnabled !== false ? (
            <button
              disabled={loadingProvider !== null}
              onClick={() => handleLogin('microsoft')}
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 border border-stone-300/80 dark:border-stone-700 rounded-2xl bg-white dark:bg-[#202533] text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-[#282F40] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <MicrosoftIcon />
              <span>{loadingProvider === 'microsoft' ? t('Conectando con Microsoft…') : t('Continuar con Microsoft 365')}</span>
            </button>
          ) : (
            <button
              disabled
              title={t('Próximamente disponible')}
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 border border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50 dark:bg-[#161A24] text-stone-400 dark:text-stone-500 text-xs font-semibold opacity-60 cursor-not-allowed"
            >
              <MicrosoftIcon />
              <span className="flex-1 text-left">{t('Continuar con Microsoft 365')}</span>
              <span className="text-[10px] bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-md font-bold">{t('Próx.')}</span>
            </button>
          )}
        </div>
        )}

        <div className="w-full my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          <span className="text-[10.5px] font-black text-stone-400 uppercase tracking-widest">{t('Alumnos')}</span>
          <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
        </div>

        <div className="w-full space-y-2.5">
          <button
            onClick={handleSoyAlumno}
            type="button"
            className="flex items-center justify-center gap-2.5 w-full px-4 py-3.5 border border-emerald-300 dark:border-emerald-700/80 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-xs cursor-pointer group"
          >
            <Icon name="backpack" size={16} className="group-hover:scale-110 transition-transform" />
            <span>{t('Ingreso Alumno con Código')}</span>
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            type="button"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 rounded-2xl text-stone-700 dark:text-stone-300 hover:text-emerald-800 text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors cursor-pointer"
          >
            <Icon name="qrCode" size={15} className="text-emerald-700" />
            <span>{t('Escanear QR de Aula')}</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center mt-6 leading-relaxed">
          {t('Acceso protegido para personal docente y directivo. Alumnos acceden sin contraseña mediante código de actividad o QR permanente.')}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs text-stone-500 font-medium">
        <a href="/" className="hover:text-emerald-700 transition-colors">{t('← Volver al inicio')}</a>
        <span>·</span>
        <a href="/privacidad" className="hover:text-emerald-700 transition-colors">{t('Privacidad PBA')}</a>
      </div>

      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleCodeScanned}
      />
    </div>
  );
}

