import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { getInstitutionMetrics, getPlatformMetrics } from '../../../services/resultsService';
import type { UsageMetrics } from '../../../types/result';

interface UsageMetricsPanelProps {
  institutionId?: string;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('es-AR')}%`;
}

function number(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('es-AR');
}

export function UsageMetricsPanel({ institutionId }: UsageMetricsPanelProps) {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = institutionId ? getInstitutionMetrics(institutionId) : getPlatformMetrics();
    load.then(setMetrics).catch((err: Error) => setError(err.message || 'No se pudieron cargar las métricas'));
  }, [institutionId]);

  if (error) return <div className="text-xs text-text-sec">{error}</div>;
  if (!metrics) return <div className="text-xs text-text-sec">Cargando métricas de uso…</div>;

  const maxTeachers = Math.max(1, ...metrics.weeklyActiveTeachers.map((w) => w.teachers));
  const tiles: { label: string; value: string; hint: string }[] = [
    { label: 'Docentes activos (30 días)', value: number(metrics.activeTeachersLast30), hint: 'Crearon o recibieron respuestas' },
    {
      label: 'Actividades por docente',
      value: number(metrics.activitiesPerActiveTeacherLast30),
      hint: `${metrics.activitiesLast30} actividades en 30 días`,
    },
    { label: 'Tasa de completitud', value: percent(metrics.completionRate), hint: 'Alumnos que respondieron / registrados' },
    {
      label: 'Preguntas de la IA sin editar',
      value: percent(metrics.questionsApprovedUnedited),
      hint: `Sobre ${metrics.questionsApproved} aprobadas (90 días)`,
    },
    {
      label: 'Correcciones de la IA confirmadas',
      value: percent(metrics.aiGradesConfirmed),
      hint: `Sobre ${metrics.aiGradesReviewed} revisadas por docentes`,
    },
    {
      label: 'Uso de IA (30 días)',
      value: number(metrics.aiCallsLast30.generation + metrics.aiCallsLast30.grading),
      hint: `${metrics.aiCallsLast30.generation} generaciones · ${metrics.aiCallsLast30.grading} correcciones · ${metrics.aiCallsLast30.failed} fallidas`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-xl p-3.5">
            <div className="text-[11px] text-stone-500 font-semibold">{tile.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{tile.value}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">{tile.hint}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-3">
          <Icon name="activity" size={13} />
          Docentes activos por semana
        </div>
        {metrics.weeklyActiveTeachers.length === 0 ? (
          <div className="text-xs text-stone-500">Todavía no hay actividad registrada en las últimas 8 semanas.</div>
        ) : (
          <div className="flex items-end gap-2 h-28">
            {metrics.weeklyActiveTeachers.map((w) => (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="text-[10px] font-semibold text-slate-700 dark:text-stone-300 tabular-nums">{w.teachers}</div>
                <div
                  className="w-full rounded-t-md bg-emerald-600/80"
                  style={{ height: `${Math.max(4, (w.teachers / maxTeachers) * 80)}px` }}
                  title={`Semana del ${w.weekStart}: ${w.teachers} docentes`}
                />
                <div className="text-[9px] text-stone-400 truncate w-full text-center">{w.weekStart.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
