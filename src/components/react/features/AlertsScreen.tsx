import { useEffect, useState } from 'react';
import { AlertItem } from '../ui/AlertItem';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { getPerformanceAlerts } from '../../../services/alertService';
import type { PerformanceAlert } from '../../../types/alert';
import type { IconName } from '../../../lib/iconPaths';

const severityIcon: Record<PerformanceAlert['severity'], { icon: IconName; variant: 'red' | 'amber' | 'green' }> = {
  critica: { icon: 'alertTriangle', variant: 'red' },
  advertencia: { icon: 'info', variant: 'amber' },
  resuelta: { icon: 'check', variant: 'green' },
};

export function AlertsScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    if (session) getPerformanceAlerts(session.user.institutionId).then(setAlerts);
  }, [session]);

  if (!session) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-border rounded-xl p-4 flex items-start gap-3.5">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Alertas Tempranas de Rendimiento
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Detección preventiva de cursos y áreas por debajo del umbral institucional (60%)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const meta = severityIcon[alert.severity];
          return (
            <AlertItem
              key={alert.id}
              icon={meta.icon}
              variant={meta.variant}
              title={`${alert.courseName} — ${alert.message}`}
              desc={
                alert.severity !== 'resuelta' ? (
                  <>
                    Promedio en eje {alert.axis}:{' '}
                    <strong className={alert.severity === 'critica' ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-amber-700 dark:text-amber-400 font-bold'}>
                      {alert.currentValue}%
                    </strong>{' '}
                    (umbral esperado: {alert.threshold}%) · Docente a cargo: {alert.teacherName}
                  </>
                ) : undefined
              }
              date={alert.severity !== 'resuelta' ? `Detectado el ${alert.detectedAt}` : undefined}
            >
              {alert.severity === 'resuelta' ? (
                <Badge color="green">Resuelto</Badge>
              ) : (
                <button
                  onClick={() => (window.location.href = `/institucional`)}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                >
                  <span>Ver detalle</span>
                  <Icon name="arrowRight" size={13} />
                </button>
              )}
            </AlertItem>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
        <span>Las alertas se actualizan de forma continua tras cada cierre de actividad docente.</span>
        <a href="/institucional/configuracion" className="text-emerald-750 font-semibold hover:underline">Configurar umbrales</a>
      </div>
    </div>
  );
}
