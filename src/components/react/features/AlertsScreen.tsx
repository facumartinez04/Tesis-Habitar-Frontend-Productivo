import { useEffect, useState } from 'react';
import { AlertItem } from '../ui/AlertItem';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
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

  if (!session) return <div className="text-xs text-text-ter">Cargando…</div>;

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Alertas de rendimiento</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        Cursos que descendieron por debajo del umbral institucional (60%)
      </div>

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
                  Promedio {alert.axis}:{' '}
                  <strong className={alert.severity === 'critica' ? 'text-red-text' : 'text-amber-text'}>
                    {alert.currentValue}%
                  </strong>{' '}
                  (umbral: {alert.threshold}%) · Docente: {alert.teacherName}
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
                className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs whitespace-nowrap"
              >
                Ver detalle
                <Icon name="arrowRight" size={13} />
              </button>
            )}
          </AlertItem>
        );
      })}

      <hr className="border-gray-border my-3.5" />
      <div className="text-[11.5px] text-text-ter">
        Las alertas se actualizan automáticamente y se notifican por correo.{' '}
        <a href="#" className="text-green-dark">Configurar preferencias</a>
      </div>
    </div>
  );
}
