import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { MetricCard } from '../ui/MetricCard';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { listMyCourses } from '../../../services/courseService';
import { compareCoursePeriods, exportCourseReport, getTeacherCourseSummary, type PeriodComparison } from '../../../services/resultsService';
import { getAiUsage, type AiUsageSnapshot } from '../../../services/aiUsageService';
import { duplicateActivity, listActivitiesByCourse, publishActivityNow, type ActivitySummary } from '../../../services/activityService';
import type { CourseResultSummary, PerformanceStatus } from '../../../types/result';

const activityStatusBadge: Record<ActivitySummary['status'], { label: string; color: 'green' | 'amber' | 'gray' }> = {
  borrador: { label: 'Borrador', color: 'gray' },
  programada: { label: 'Programada', color: 'amber' },
  publicada: { label: 'Publicada', color: 'green' },
  cerrada: { label: 'Cerrada', color: 'gray' },
};

const statusBadge: Record<PerformanceStatus, { label: ReactNode; color: 'green' | 'amber' | 'red' | 'gray' }> = {
  bien: { label: 'Bien', color: 'green' },
  regular: { label: 'Regular', color: 'amber' },
  bajo: {
    label: (
      <span className="flex items-center gap-1">
        <Icon name="alertTriangle" size={11} />
        Bajo
      </span>
    ),
    color: 'red',
  },
  sin_datos: { label: 'Sin datos', color: 'gray' },
};

export function TeacherDashboard() {
  const session = useAuthGuard(['docente']);
  const [summary, setSummary] = useState<CourseResultSummary | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSnapshot | null>(null);
  const { message, showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [range, setRange] = useState({ fromA: '', toA: '', fromB: '', toB: '' });
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);

  function refreshActivities(courseId: string) {
    listActivitiesByCourse(courseId).then(setActivities);
  }

  useEffect(() => {
    listMyCourses().then((courses) => {
      if (!courses[0]) return;
      getTeacherCourseSummary(courses[0].id).then((result) => setSummary(result ?? null));
      refreshActivities(courses[0].id);
    });
    if (session) getAiUsage(session.user.institutionId).then(setAiUsage);

  }, [session]);

  async function handleDuplicate(activityId: string) {
    setBusyActivityId(activityId);
    try {
      await duplicateActivity(activityId);
      showToast('Actividad duplicada como borrador');
      if (summary) refreshActivities(summary.courseId);
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handlePublishNow(activityId: string) {
    setBusyActivityId(activityId);
    try {
      await publishActivityNow(activityId);
      showToast('Actividad publicada');
      if (summary) refreshActivities(summary.courseId);
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handleExport() {
    if (!summary) return;
    setExporting(true);
    try {
      await exportCourseReport(summary.courseId);
      showToast('Reporte exportado');
    } catch {
      showToast('No se pudo exportar el reporte');
    } finally {
      setExporting(false);
    }
  }

  async function handleCompare() {
    if (!summary || !range.fromA || !range.toA || !range.fromB || !range.toB) return;
    setComparing(true);
    try {
      const result = await compareCoursePeriods(
        summary.courseId,
        { from: range.fromA, to: range.toA },
        { from: range.fromB, to: range.toB },
      );
      setComparison(result);
    } finally {
      setComparing(false);
    }
  }

  if (!session || !summary) {
    return <div className="text-xs text-text-ter">Cargando…</div>;
  }

  return (
    <div>
      <Toast message={message} />
      <div className="flex items-start justify-between gap-3 mb-[3px]">
        <div className="text-lg font-semibold text-text-pri tracking-tight">Mis cursos — {summary.courseName}</div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-[11.5px]"
          >
            <Icon name="activity" size={12} />
            Comparar períodos
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-[11.5px] disabled:opacity-50"
          >
            <Icon name="download" size={12} />
            {exporting ? 'Exportando…' : 'Exportar reporte'}
          </button>
        </div>
      </div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        Comprensión lectora · Jun 2026 · {summary.studentCount} alumnos
      </div>

      {aiUsage && (
        <div className="flex items-center gap-2 text-[11px] text-text-sec bg-surface border border-gray-border rounded-md px-2.5 py-1.5 mb-3.5">
          <Icon name="sparkles" size={11} />
          Uso de IA este mes: <strong>{aiUsage.used}</strong> / {aiUsage.quota}
          {aiUsage.overQuota && <span className="text-red font-medium">— cupo agotado, se usa el generador por plantillas</span>}
        </div>
      )}

      {compareOpen && (
        <div className="card bg-white border border-gray-border rounded-md p-3.5 mb-3.5">
          <div className="text-[12.5px] font-medium mb-2.5">CU-03-07 · Comparar desempeño entre dos períodos</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
            <input type="date" value={range.fromA} onChange={(e) => setRange((r) => ({ ...r, fromA: e.target.value }))} className="border border-gray-border rounded-md px-2 py-1.5 text-[11.5px]" placeholder="Desde A" />
            <input type="date" value={range.toA} onChange={(e) => setRange((r) => ({ ...r, toA: e.target.value }))} className="border border-gray-border rounded-md px-2 py-1.5 text-[11.5px]" placeholder="Hasta A" />
            <input type="date" value={range.fromB} onChange={(e) => setRange((r) => ({ ...r, fromB: e.target.value }))} className="border border-gray-border rounded-md px-2 py-1.5 text-[11.5px]" placeholder="Desde B" />
            <input type="date" value={range.toB} onChange={(e) => setRange((r) => ({ ...r, toB: e.target.value }))} className="border border-gray-border rounded-md px-2 py-1.5 text-[11.5px]" placeholder="Hasta B" />
          </div>
          <button onClick={handleCompare} disabled={comparing} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {comparing ? 'Comparando…' : 'Comparar'}
          </button>

          {comparison && (
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {(['literal', 'inferencial', 'critico'] as const).map((axis) => (
                <div key={axis} className="bg-surface rounded-md px-2.5 py-2 text-center">
                  <div className="text-[10px] text-text-ter uppercase">{axis}</div>
                  <div className="text-[13px] font-semibold">
                    {comparison.periodA.averages[axis]}% → {comparison.periodB.averages[axis]}%
                  </div>
                  <div className={`text-[10.5px] ${comparison.delta[axis] >= 0 ? 'text-green-mid' : 'text-red'}`}>
                    {comparison.delta[axis] >= 0 ? '+' : ''}{comparison.delta[axis]} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-[18px]">
        <MetricCard value={`${summary.averages.literal}%`} label="Literal" color="var(--color-green-mid)" />
        <MetricCard value={`${summary.averages.inferencial}%`} label="Inferencial" color="var(--color-amber)" />
        <MetricCard value={`${summary.averages.critico}%`} label="Crítico" color="var(--color-red)" />
        <MetricCard value={String(summary.activityCount)} label="Actividades" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Alumno</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Literal</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Inferencial</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Crítico</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr
              key={row.studentId}
              onClick={() => (window.location.href = `/docente/alumnos?id=${row.studentId}`)}
              className={`cursor-pointer hover:bg-surface ${row.status === 'bajo' ? 'bg-red-bg/10' : ''}`}
            >
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.studentName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores ? `${row.scores.literal}%` : '—'}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores ? `${row.scores.inferencial}%` : '—'}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores ? `${row.scores.critico}%` : '—'}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={statusBadge[row.status].color}>{statusBadge[row.status].label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="text-xs font-medium text-text-sec mt-5 mb-2">CU-02-07 / CU-02-08 · Actividades del curso</div>
      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Actividad</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Código</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Disponible desde</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2.5 py-3 text-[11.5px] text-text-ter">Todavía no creaste actividades para este curso.</td>
            </tr>
          )}
          {activities.map((act) => (
            <tr key={act.id}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{act.name}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border font-mono text-[11px]">{act.code}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{act.availableFrom}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={activityStatusBadge[act.status].color}>{activityStatusBadge[act.status].label}</Badge>
              </td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleDuplicate(act.id)}
                    disabled={busyActivityId === act.id}
                    className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px] disabled:opacity-50"
                  >
                    <Icon name="copy" size={10} />
                    Duplicar
                  </button>
                  {act.status === 'programada' && (
                    <button
                      onClick={() => handlePublishNow(act.id)}
                      disabled={busyActivityId === act.id}
                      className="flex items-center gap-1 bg-green-dark text-white rounded-[6px] px-2 py-1 text-[10.5px] disabled:opacity-50"
                    >
                      Publicar ahora
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
