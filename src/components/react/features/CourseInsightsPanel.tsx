import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { getCourseDiagnostic, getCourseRecommendation } from '../../../services/resultsService';
import { deltaPts, pct } from '../../../lib/scores';
import type { AxisRecommendation, DiagnosticComparison } from '../../../types/result';

interface CourseInsightsPanelProps {
  courseId: string;
  /** Cambia cuando hay resultados nuevos (por ejemplo, después de revisar respuestas). */
  refreshKey?: number;
}

const AXES = [
  { key: 'literal', label: 'Literal' },
  { key: 'inferencial', label: 'Inferencial' },
  { key: 'critico', label: 'Crítico' },
] as const;

/**
 * Recomendación de eje foco (mejora 2) y evolución entre la diagnóstica de inicio y la de cierre (mejora 1).
 * Es lo que le dice al docente qué hacer después y le muestra al colegio si los chicos mejoraron.
 */
export function CourseInsightsPanel({ courseId, refreshKey = 0 }: CourseInsightsPanelProps) {
  const [recommendation, setRecommendation] = useState<AxisRecommendation | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticComparison | null>(null);

  useEffect(() => {
    if (!courseId) return;
    getCourseRecommendation(courseId).then(setRecommendation).catch(() => setRecommendation(null));
    getCourseDiagnostic(courseId).then(setDiagnostic).catch(() => setDiagnostic(null));
  }, [courseId, refreshKey]);

  const focus = recommendation?.focusAxis?.toLowerCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="target" size={15} className="text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sugerencia para la próxima actividad</h3>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          {recommendation?.message ?? 'Cargando…'}
        </p>
        {recommendation && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {AXES.map((axis) => (
              <div
                key={axis.key}
                className={`rounded-xl border px-2.5 py-2 text-center ${
                  focus === axis.key ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{axis.label}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{pct(recommendation.averages[axis.key])}</div>
              </div>
            ))}
          </div>
        )}
        {focus && (
          <a
            href={`/docente/actividades/nueva?courseId=${encodeURIComponent(courseId)}&focus=${focus}`}
            className="inline-flex items-center gap-1.5 mt-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl"
          >
            Crear actividad de refuerzo
            <Icon name="arrowRight" size={12} />
          </a>
        )}
      </div>

      <div className="bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="trendingUp" size={15} className="text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Evolución del ciclo</h3>
        </div>
        {!diagnostic ? (
          <p className="text-xs text-stone-500">Cargando…</p>
        ) : !diagnostic.inicio ? (
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Marcá una actividad como <strong>diagnóstica de inicio</strong> al crearla y, al final del ciclo, otra como
            <strong> diagnóstica de cierre</strong>. Habitar va a mostrar acá cuánto mejoró cada alumno en cada eje.
          </p>
        ) : !diagnostic.cierre || !diagnostic.course ? (
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Diagnóstica de inicio: <strong>{diagnostic.inicio.name}</strong> ({diagnostic.inicio.date}). Falta la diagnóstica de
            cierre para comparar.
          </p>
        ) : (
          <>
            <p className="text-xs text-stone-500 mb-3">
              {diagnostic.inicio.name} → {diagnostic.cierre.name} · {diagnostic.students.length} alumnos con las dos
              {diagnostic.incomplete.length > 0 && ` · ${diagnostic.incomplete.length} con una sola (no se incluyen)`}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map((axis) => {
                const delta = diagnostic.course!.delta[axis.key];
                return (
                  <div key={axis.key} className="rounded-xl border border-stone-200 dark:border-stone-700 px-2.5 py-2 text-center">
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{axis.label}</div>
                    <div className="text-xs text-slate-900 dark:text-white font-semibold">
                      {pct(diagnostic.course!.inicio[axis.key])} → {pct(diagnostic.course!.cierre[axis.key])}
                    </div>
                    <div className={`text-xs font-bold ${delta === null ? 'text-stone-400' : delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {deltaPts(delta)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
