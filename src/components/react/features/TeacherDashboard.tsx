import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { MetricCard } from '../ui/MetricCard';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonMetricCards, SkeletonCard } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { listMyCourses } from '../../../services/courseService';
import { compareCoursePeriods, exportCourseReport, getTeacherCourseSummary, type PeriodComparison } from '../../../services/resultsService';
import { getAiUsage, type AiUsageSnapshot } from '../../../services/aiUsageService';
import { duplicateActivity, listActivitiesByCourse, publishActivityNow, type ActivitySummary } from '../../../services/activityService';
import { confirmAction } from '../../../lib/alerts';
import type { CourseResultSummary, PerformanceStatus } from '../../../types/result';
import type { Course } from '../../../types/activity';
import { QrScannerModal } from './QrScannerModal';
import { CreateCourseModal } from './CreateCourseModal';
import { CourseQrModal } from './CourseQrModal';
import { CourseDevicesModal } from './CourseDevicesModal';

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
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
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [selectedQrCourse, setSelectedQrCourse] = useState<Course | null>(null);
  const [scannedCourse, setScannedCourse] = useState<Course | null>(null);

  function refreshActivities(courseId: string) {
    listActivitiesByCourse(courseId).then(setActivities);
  }

  function loadCourseData(courseId: string) {
    getTeacherCourseSummary(courseId).then((result) => setSummary(result ?? null));
    refreshActivities(courseId);
  }

  async function loadCourses(targetId?: string) {
    setLoadingCourses(true);
    try {
      const list = await listMyCourses();
      setCourses(list);
      const activeId = targetId || selectedCourseId || list[0]?.id || '';
      if (activeId) {
        setSelectedCourseId(activeId);
        loadCourseData(activeId);
      }
    } catch {
      showToast('Error al cargar la lista de aulas');
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    loadCourses();
    if (session) getAiUsage(session.user.institutionId).then(setAiUsage);
  }, [session]);

  function handleSelectCourse(id: string) {
    setSelectedCourseId(id);
    loadCourseData(id);
  }

  function handleCourseScanned(course: Course) {
    setScannedCourse(course);
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === course.id);
      return exists ? prev : [course, ...prev];
    });
    setSelectedCourseId(course.id);
    loadCourseData(course.id);
    showToast(`Conectado al aula: ${course.name}`);
  }

  function handleCourseCreated(newCourse: Course) {
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.id);
    loadCourseData(newCourse.id);
    showToast(`Aula "${newCourse.name}" creada exitosamente`);
    // Open QR modal immediately so teacher can print/download
    setSelectedQrCourse(newCourse);
  }

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
    const confirmed = await confirmAction({
      title: '¿Publicar la actividad ahora?',
      text: 'Va a quedar disponible para los alumnos antes de la fecha programada.',
      confirmButtonText: 'Sí, publicar',
    });
    if (!confirmed) return;

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

  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  if (!session || loadingCourses) {
    return <HabitarLoader size="lg" message="Cargando tus aulas y métricas pedagógicas..." />;
  }

  if (courses.length === 0) {
    return (
      <div>
        <Toast message={message} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-text-pri tracking-tight">Mis Aulas y Cursos</h1>
            <p className="text-[12.5px] text-text-sec">Aulas físicas con código QR permanente para actividades</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] px-3 py-1.5 text-[11.5px] font-medium shadow-sm transition-colors"
            >
              <Icon name="camera" size={13} />
              Escanear QR de Aula
            </button>
            <button
              onClick={() => setIsCreateCourseOpen(true)}
              className="flex items-center gap-1.5 bg-green-dark hover:opacity-95 text-white rounded-[6px] px-3 py-1.5 text-[11.5px] font-medium transition-colors"
            >
              <Icon name="plus" size={12} />
              Crear Nueva Aula
            </button>
          </div>
        </div>

        <div className="card bg-white border border-gray-border rounded-xl p-8 text-center max-w-lg mx-auto my-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Icon name="school" size={28} />
          </div>
          <h2 className="text-base font-semibold text-text-pri mb-1">Aún no tenés aulas creadas</h2>
          <p className="text-xs text-text-sec mb-5 leading-relaxed">
            Creá un aula física fija (con salón, grado y división) para generar su código QR permanente, o escaneá el QR fijo de un aula existente.
          </p>
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => setIsCreateCourseOpen(true)}
              className="px-4 py-2 bg-green-dark text-white rounded-lg text-xs font-medium shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <Icon name="plus" size={13} />
              Crear mi primera aula
            </button>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 bg-surface hover:bg-gray-100 border border-gray-border text-text-pri rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Icon name="camera" size={13} />
              Escanear QR existente
            </button>
          </div>
        </div>

        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSelectCourse={handleCourseScanned}
        />
        <CreateCourseModal
          isOpen={isCreateCourseOpen}
          onClose={() => setIsCreateCourseOpen(false)}
          onCreated={handleCourseCreated}
        />
        <CourseQrModal
          course={selectedQrCourse}
          isOpen={Boolean(selectedQrCourse)}
          onClose={() => setSelectedQrCourse(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <Toast message={message} />

      {/* Classroom Connected Banner */}
      {scannedCourse && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <Icon name="check" size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-950 flex items-center gap-2">
                <span>Conectado al aula física: <strong>{scannedCourse.name}</strong></span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-medium">
                  {scannedCourse.qrCode}
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                {scannedCourse.subject && `Materia: ${scannedCourse.subject} · `}
                {scannedCourse.room ? `Salón: ${scannedCourse.room} · ` : ''}
                {scannedCourse.shift ? `Turno: ${scannedCourse.shift} · ` : ''}
                El aula está seleccionada para subir lecturas o vincular actividades.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <a
              href={`/docente/actividades/nueva?courseId=${scannedCourse.id}`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Icon name="fileText" size={13} />
              Subir lectura para este aula
            </a>
            <button
              onClick={() => setSelectedQrCourse(scannedCourse)}
              className="bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Icon name="qrCode" size={12} />
              Ver QR
            </button>
            <button
              onClick={() => setScannedCourse(null)}
              className="text-emerald-600 hover:text-emerald-900 p-1 text-sm leading-none"
              title="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-lg font-semibold text-text-pri tracking-tight">
            Mis aulas y cursos
          </div>
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="bg-white border border-gray-border rounded-md px-2.5 py-1 text-xs font-medium text-text-pri hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.room ? `(Salón ${c.room})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] px-3 py-1.5 text-[11.5px] font-medium shadow-sm transition-colors"
            title="Escanear el código QR fijo del aula"
          >
            <Icon name="camera" size={13} />
            Escanear QR de Aula
          </button>
          <button
            onClick={() => setIsCreateCourseOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-gray-border hover:bg-surface rounded-[6px] px-2.5 py-1.5 text-[11.5px] font-medium text-text-pri transition-colors"
          >
            <Icon name="plus" size={12} />
            Nueva Aula
          </button>
          {currentCourse && (
            <>
              <button
                onClick={() => setSelectedQrCourse(currentCourse)}
                className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-[#2D3342] hover:bg-surface rounded-[6px] px-2.5 py-1.5 text-[11.5px] text-text-pri transition-colors cursor-pointer"
                title="Ver e imprimir el QR fijo de esta aula"
              >
                <Icon name="qrCode" size={13} />
                <span>QR Fijo</span>
              </button>
              <button
                onClick={() => setIsDevicesModalOpen(true)}
                className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-[#2D3342] hover:bg-surface rounded-[6px] px-2.5 py-1.5 text-[11.5px] text-text-pri transition-colors cursor-pointer"
                title="Ver y desvincular dispositivos de alumnos de esta aula física"
              >
                <Icon name="kanban" size={13} />
                <span>Dispositivos</span>
              </button>
            </>
          )}
          <a
            href={`/docente/actividades/nueva?courseId=${currentCourse?.id || ''}`}
            className="flex items-center gap-1.5 bg-green-dark hover:opacity-90 text-white rounded-[6px] px-3 py-1.5 text-[11.5px] font-medium shadow-sm transition-colors"
          >
            <Icon name="fileText" size={12} />
            Subir Lectura
          </a>
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-[11.5px]"
          >
            <Icon name="activity" size={12} />
            Comparar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-[11.5px] disabled:opacity-50"
          >
            <Icon name="download" size={12} />
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
        </div>
      </div>

      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {currentCourse ? (
          <>
            Aula: <strong>{currentCourse.name}</strong>
            {currentCourse.room && <> · Salón: <strong>{currentCourse.room}</strong></>}
            {currentCourse.qrCode && <> · Código QR: <span className="font-mono text-xs">{currentCourse.qrCode}</span></>}
            {summary && <> · {summary.studentCount} alumnos</>}
          </>
        ) : (
          summary && `Comprensión lectora · ${summary.courseName} · ${summary.studentCount} alumnos`
        )}
      </div>

      {aiUsage && (
        <div className="flex items-center gap-2 text-[11px] text-text-sec bg-surface border border-gray-border rounded-md px-2.5 py-1.5 mb-3.5">
          <Icon name="sparkles" size={11} />
          Uso de IA este mes: <strong>{aiUsage.used}</strong> / {aiUsage.quota}
          {aiUsage.overQuota && <span className="text-red font-medium">— cupo agotado, se usa el generador por plantillas</span>}
        </div>
      )}

      {compareOpen && summary && (
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

      {summary && (
        <>
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
        </>
      )}

      <div className="text-xs font-medium text-text-sec mt-5 mb-2">Actividades del aula</div>
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

      {/* Classroom Modals */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectCourse={handleCourseScanned}
      />
      <CreateCourseModal
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
        onCreated={handleCourseCreated}
      />
      <CourseQrModal
        course={selectedQrCourse}
        isOpen={Boolean(selectedQrCourse)}
        onClose={() => setSelectedQrCourse(null)}
      />
      <CourseDevicesModal
        course={currentCourse}
        isOpen={isDevicesModalOpen}
        onClose={() => setIsDevicesModalOpen(false)}
      />
    </div>
  );
}
