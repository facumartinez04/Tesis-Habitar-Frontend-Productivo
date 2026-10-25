import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Dot } from '../ui/Dot';
import { MetricCard } from '../ui/MetricCard';
import { ProgressBar } from '../ui/ProgressBar';
import { TableWrap } from '../ui/TableWrap';
import { ensureAdminSession } from '../../../services/authService';
import { UsageMetricsPanel } from './UsageMetricsPanel';
import { getMonitoringSnapshot } from '../../../services/monitoringService';
import type { ComponentHealth, MonitoringSnapshot } from '../../../types/monitoring';

import { Skeleton, SkeletonMetricCards, SkeletonTable } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { t, useI18n, intlLocale } from '../../../i18n';

const healthBadge: Record<ComponentHealth, { label: string; color: 'green' | 'amber' | 'red'; dot: 'green' | 'amber' | 'red' }> = {
  operativo: { label: 'Operativo', color: 'green', dot: 'green' },
  degradado: { label: 'Degradado', color: 'amber', dot: 'amber' },
  caido: { label: 'Caído', color: 'red', dot: 'red' },
};

const incidentBadge = {
  resuelto: { label: 'Resuelto', color: 'green' as const },
  planificado: { label: 'Planificado', color: 'gray' as const },
  en_curso: { label: 'En curso', color: 'red' as const },
};

export function MonitoringScreen() {
  useI18n();
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    await ensureAdminSession();
    const result = await getMonitoringSnapshot();
    setSnapshot(result);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (!snapshot) {
    return <HabitarLoader size="lg" message={t('Cargando el estado registrado de la plataforma...')} />;
  }

  const hasComponents = snapshot.components.length > 0;
  const allOperational = hasComponents && snapshot.components.every((c) => c.health === 'operativo');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <div className="text-lg font-semibold text-text-pri">{t('Monitoreo de disponibilidad')}</div>
        {hasComponents ? (
          <span className={`text-xs font-medium flex items-center gap-1.5 ${allOperational ? 'text-green-mid' : 'text-amber-text'}`}>
            <Dot color={allOperational ? 'green' : 'amber'} />
            {allOperational ? t('Todos los sistemas operativos') : t('Degradación parcial detectada')}
          </span>
        ) : (
          <span className="text-xs font-medium flex items-center gap-1.5 text-text-sec">{t('Sin componentes registrados')}</span>
        )}
      </div>
      <div className="text-[12.5px] text-text-sec mb-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>{t('Última verificación:')}{' '}{new Date(snapshot.updatedAt).toLocaleString(intlLocale())}</span>
        <button onClick={load} disabled={refreshing} className="text-green-dark text-[11.5px] underline disabled:opacity-50 text-left">
          {refreshing ? t('Actualizando…') : t('Actualizar ahora')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-[18px]">
        <MetricCard value={snapshot.monthlyUptimePercent === null ? t('Sin datos') : `${snapshot.monthlyUptimePercent}%`} label={t('Disponibilidad mensual')} color="var(--color-green-mid)" />
        <MetricCard value={snapshot.latencyP95Seconds === null ? t('Sin datos') : `${snapshot.latencyP95Seconds}s`} label={t('Latencia p95')} />
        <MetricCard value={String(snapshot.incidentsThisMonth)} label={t('Incidentes este mes')} color="var(--color-amber)" />
      </div>

      <div className="text-xs font-medium text-text-sec mb-2.5">{t('Estado de componentes')}</div>
      <Card className="mb-4">
        {!hasComponents && <div className="text-[12.5px] text-text-sec py-2">{t('No hay componentes registrados. Las fallas reales de la API se ven en Bitácoras, pestaña Errores.')}</div>}
        {snapshot.components.map((component, i) => {
          const meta = healthBadge[component.health];
          return (
            <div key={component.id} className={`flex flex-wrap items-center gap-2.5 py-2 ${i < snapshot.components.length - 1 ? 'border-b border-gray-border' : ''}`}>
              <Dot color={meta.dot} />
              <div className="flex-1 min-w-[140px] text-[12.5px]">{component.name}</div>
              <Badge color={meta.color}>{t(meta.label)}</Badge>
              <div className="w-full sm:w-[140px] order-last sm:order-none">
                <ProgressBar percent={component.uptimePercent} color={meta.dot} />
              </div>
            </div>
          );
        })}
      </Card>

      <div className="text-xs font-medium text-text-sec mb-2">{t('Historial de incidentes')}</div>
      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Fecha')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Componente')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Duración')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Estado')}</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.incidents.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2.5 py-3 text-[12.5px] text-text-sec">{t('No hay incidentes registrados.')}</td>
            </tr>
          )}
          {snapshot.incidents.map((incident) => (
            <tr key={incident.id}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{incident.date}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{incident.component}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{incident.duration}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={incidentBadge[incident.status].color}>{t(incidentBadge[incident.status].label)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="text-[13px] font-semibold text-text-pri mt-6 mb-2">{t('Uso del producto en toda la plataforma')}</div>
      <UsageMetricsPanel />
    </div>
  );
}
