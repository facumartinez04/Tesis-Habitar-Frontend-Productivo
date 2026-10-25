import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { t, useI18n, intlLocale } from '../../../i18n';

const API_URL =
  import.meta.env.PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://api.habitar.lat/api'
    : 'http://localhost:4000/api');

interface StatusReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  checks: {
    database: { ok: boolean; detail?: string; latencyMs?: number; appliedMigrations?: number; lastMigration?: string };
    deepseek: { configured: boolean };
    oauth: {
      google: { configured: boolean };
      microsoft: { configured: boolean };
    };
  };
  config: { frontendUrl: string; port: number };
}

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: StatusReport };

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

function Dot({ ok }: { ok: boolean }) {
  useI18n();
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-mid' : 'bg-red'}`} />;
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  useI18n();
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-border last:border-0">
      <div className="flex items-center gap-2.5">
        <Dot ok={ok} />
        <span className="text-[13px] text-text-pri">{label}</span>
      </div>
      <span className={`text-[11.5px] ${ok ? 'text-green-mid' : 'text-red'}`}>{detail ?? (ok ? 'OK' : t('Error'))}</span>
    </div>
  );
}

export function StatusScreen() {
  useI18n();
  const [backend, setBackend] = useState<FetchState>({ kind: 'loading' });
  const [swActive, setSwActive] = useState<boolean | null>(null);

  async function loadBackendStatus() {
    setBackend({ kind: 'loading' });
    try {
      const res = await fetch(`${API_URL}/status`);
      const report = (await res.json()) as StatusReport;
      setBackend({ kind: 'ready', report });
    } catch {
      setBackend({ kind: 'error', message: t('No se pudo contactar al backend') });
    }
  }

  useEffect(() => {
    loadBackendStatus();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => setSwActive(regs.some((r) => !!r.active)));
    } else {
      setSwActive(false);
    }
  }, []);

  const overallOk = backend.kind === 'ready' && backend.report.status === 'ok';

  return (
    <div className="flex flex-col items-center px-6 py-12 min-h-screen bg-surface">
      <div className="w-full max-w-[480px]">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[22px] font-bold text-text-pri tracking-tight">
            Habi<span className="text-green-dark">tar</span>{' '}{t('— Status')}
          </div>
          <button
            onClick={loadBackendStatus}
            className="text-[11.5px] text-text-sec border border-gray-border rounded-md px-2.5 py-1.5 hover:border-green-mid transition-colors"
          >
            {t('Actualizar')}
          </button>
        </div>

        <div className="bg-white border border-gray-border rounded-xl p-4 mb-4">
          <div className="text-[12px] font-semibold text-text-sec uppercase tracking-wide mb-2">{t('Frontend')}</div>
          <Row label={t('Sitio cargado')} ok={true} />
          <Row label={t('PWA / Service worker')} ok={swActive === true} detail={swActive === null ? t('Verificando…') : swActive ? t('Activo') : t('No registrado')} />
          <Row label={t('Conexión a internet')} ok={navigator.onLine} detail={navigator.onLine ? t('Online') : t('Offline')} />
        </div>

        <div className="bg-white border border-gray-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-semibold text-text-sec uppercase tracking-wide">{t('Backend')}</div>
            {backend.kind === 'ready' && (
              <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${overallOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {backend.report.status.toUpperCase()}
              </span>
            )}
          </div>

          {backend.kind === 'loading' && (
            <div className="py-2 space-y-2.5">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between items-center py-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          )}

          {backend.kind === 'error' && (
            <div className="text-[12px] text-red bg-red-100 rounded-md px-3 py-2">{backend.message}</div>
          )}

          {backend.kind === 'ready' && (
            <>
              <Row label={t('API alcanzable')} ok={true} />
              <Row
                label={t('Base de datos')}
                ok={backend.report.checks.database.ok}
                detail={
                  backend.report.checks.database.ok
                    ? `${backend.report.checks.database.latencyMs}ms`
                    : backend.report.checks.database.detail
                }
              />
              {backend.report.checks.database.ok && (
                <Row
                  label={t('Migraciones aplicadas')}
                  ok={true}
                  detail={
                    backend.report.checks.database.appliedMigrations !== undefined
                      ? `${backend.report.checks.database.appliedMigrations} (última: ${backend.report.checks.database.lastMigration ?? '—'})`
                      : t('Sin datos')
                  }
                />
              )}
              <Row label={t('IA — DeepSeek')} ok={backend.report.checks.deepseek.configured} detail={backend.report.checks.deepseek.configured ? t('Configurada') : t('Sin configurar (usa plantillas)')} />
              <Row label={t('OAuth — Google')} ok={backend.report.checks.oauth.google.configured} detail={backend.report.checks.oauth.google.configured ? t('Configurado') : t('Sin configurar')} />
              <Row label={t('OAuth — Microsoft')} ok={backend.report.checks.oauth.microsoft.configured} detail={backend.report.checks.oauth.microsoft.configured ? t('Configurado') : t('Sin configurar')} />

              <div className="mt-3 pt-3 border-t border-gray-border text-[11px] text-text-ter space-y-0.5">
                <div>{t('Uptime: {formatUptime}', { formatUptime: formatUptime(backend.report.uptimeSeconds) })}</div>
                <div>{t('Node: {nodeVersion}', { nodeVersion: backend.report.nodeVersion })}</div>
                <div>{t('FRONTEND_URL configurado: {frontendUrl}', { frontendUrl: backend.report.config.frontendUrl })}</div>
                <div>{t('Última actualización:')}{' '}{new Date(backend.report.timestamp).toLocaleTimeString(intlLocale())}</div>
              </div>
            </>
          )}
        </div>

        <a href="/login" className="text-[11.5px] text-text-sec underline block text-center">{t('Volver al login')}</a>
      </div>
    </div>
  );
}
