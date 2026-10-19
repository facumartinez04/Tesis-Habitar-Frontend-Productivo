import { pct, deltaPts } from '../../../lib/scores';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
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
import {
  closeActivityNow,
  duplicateActivity,
  listActivitiesByCourse,
  publishActivityNow,
  type ActivitySummary,
  saveActivityAsTemplate,
} from '../../../services/activityService';
import { confirmAction } from '../../../lib/alerts';
import type { CourseResultSummary, PerformanceStatus } from '../../../types/result';
import type { Course } from '../../../types/activity';
import { QrScannerModal } from './QrScannerModal';

import { CourseQrModal } from './CourseQrModal';
import { CourseDevicesModal } from './CourseDevicesModal';
import { ReviewAnswersModal } from './ReviewAnswersModal';
import { CourseInsightsPanel } from './CourseInsightsPanel';
import { CourseCardsGrid } from './CourseCardsGrid';

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
  // Grilla de tarjetas de aulas, o detalle de un aula. El aula abierta queda en la URL (?curso=…).
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [summary, setSummary] = useState<CourseResultSummary | null>(null);
  const pagedRows = usePagination(summary?.rows ?? [], 15, selectedCourseId);
  const [aiUsage, setAiUsage] = useState<AiUsageSnapshot | null>(null);
  const { message, showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [range, setRange] = useState({ fromA: '', toA: '', fromB: '', toB: '' });
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const pagedActivities = usePagination(activities, 10, selectedCourseId);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedQrCourse, setSelectedQrCourse] = useState<Course | null>(null);
  const [scannedCourse, setScannedCourse] = useState<Course | null>(null);
  const [reviewActivity, setReviewActivity] = useState<{ id: string; name: string } | null>(null);
  const [insightsKey, setInsightsKey] = useState(0);

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
      const fromUrl = targetId || new URLSearchParams(window.location.search).get('curso') || '';
      if (fromUrl && list.some((c) => c.id === fromUrl)) {
        setSelectedCourseId(fromUrl);
        loadCourseData(fromUrl);
        setView('detail');
      } else {
        setView('grid');
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

  function setCourseInUrl(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('curso', id);
    else url.searchParams.delete('curso');
    window.history.pushState(null, '', url.toString());
  }

  function openCourse(id: string) {
    setSelectedCourseId(id);
    setSummary(null);
    setComparison(null);
    loadCourseData(id);
    setView('detail');
    setCourseInUrl(id);
    window.scrollTo({ top: 0 });
  }

  function backToGrid() {
    setView('grid');
    setCourseInUrl(null);
    // Vuelve a pedir la lista para que la cantidad de alumnos de cada tarjeta esté al día.
    listMyCourses().then(setCourses).catch(() => undefined);
  }

  // Botones Atrás y Adelante del navegador.
  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get('curso');
      if (id && courses.some((c) => c.id === id)) {
        setSelectedCourseId(id);
        loadCourseData(id);
        setView('detail');
      } else {
        setView('grid');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [courses]);

  function handleSelectCourse(id: string) {
    openCourse(id);
  }

  function handleCourseScanned(course: Course) {
    setScannedCourse(course);
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === course.id);
      return exists ? prev : [course, ...prev];
    });
    openCourse(course.id);
    showToast(`Conectado al aula: ${course.name}`);
  }


  async function handleDuplicate(activityId: string) {
    setBusyActivityId(activityId);
    try {
      await duplicateActivity(activityId);
      showToast('Actividad duplicada como borrador');
      if (summary) refreshActivities(summary.courseId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo duplicar la actividad');
    } finally {
      setBusyActivityId(null);
    }
  }

  /** Guarda la actividad en el banco de la institución (antes de cerrarla, mientras todavía tiene el texto). */
  async function handleSaveToBank(activityId: string, activityName: string) {
    setBusyActivityId(activityId);
    try {
      await saveActivityAsTemplate(activityId);
      showToast(`«${activityName}» quedó en el banco de la institución`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar en el banco');
    } finally {
      setBusyActivityId(null);
    }
  }

  async function handleCloseNow(activityId: string) {
    const confirmed = await confirmAction({
      title: '¿Cerrar la actividad ahora?',
      text: 'Los alumnos ya no van a poder responder, y el texto se borra de Habitar como prevé la política de datos.',
      confirmButtonText: 'Sí, cerrar',
    });
    if (!confirmed) return;
    setBusyActivityId(activityId);
    try {
      await closeActivityNow(activityId);
      showToast('Actividad cerrada');
      if (summary) refreshActivities(summary.courseId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo cerrar la actividad');
    } finally {
      setBusyActivityId(null);
    }
  }

  function handleReviewed() {
    if (!selectedCourseId) return;
    getTeacherCourseSummary(selectedCourseId).then((result) => setSummary(result ?? null));
    setInsightsKey((k) => k + 1);
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
          </div>
        </div>

        <div className="card bg-white border border-gray-border rounded-xl p-8 text-center max-w-lg mx-auto my-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Icon name="school" size={28} />
          </div>
          <h2 className="text-base font-semibold text-text-pri mb-1">Aún no tenés aulas asignadas</h2>
          <p className="text-xs text-text-sec mb-5 leading-relaxed">
            Pedile a tu coordinador o director que te asigne un aula, o escaneá el QR fijo de un aula existente para conectarte.
          </p>
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all flex items-center gap-1.5"
            >
              <Icon name="camera" size={13} />
              Escanear QR de Aula
            </button>
          </div>
        </div>

        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCourseDetected={handleCourseScanned}
        />
        <CourseQrModal
          course={selectedQrCourse}
          isOpen={Boolean(selectedQrCourse)}
          onClose={() => setSelectedQrCourse(null)}
        />
      </div>
    );
  }

  if (view === 'grid') {
    const totalStudents = courses.reduce((sum, c) => sum + (c.studentsCount ?? 0), 0);
    return (
      <div>
        <Toast message={message} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Mis Aulas y Cursos</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {courses.length === 1 ? '1 aula' : `${courses.length} aulas`} · {totalStudents}{' '}
              {totalStudents === 1 ? 'alumno registrado' : 'alumnos registrados'}. Entrá a un aula para ver sus resultados y
              actividades.
            </p>
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
            title="Escanear el código QR fijo del aula"
          >
            <Icon name="camera" size={14} />
            <span>Escanear QR</span>
          </button>
        </div>

        <CourseCardsGrid courses={courses} onOpen={openCourse} onShowQr={setSelectedQrCourse} />

        <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onCourseDetected={handleCourseScanned} />
        <CourseQrModal course={selectedQrCourse} isOpen={Boolean(selectedQrCourse)} onClose={() => setSelectedQrCourse(null)} />
      </div>
    );
  }

  return (
    <div>
      <Toast message={message} />

      <button
        type="button"
        onClick={backToGrid}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 mb-3 cursor-pointer"
      >
        <Icon name="arrowLeft" size={13} />
        Todas mis aulas
      </button>

      {}
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
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {currentCourse?.name ?? 'Aula'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Diagnóstico áulico formativo y gestión de actividades
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Escanear el código QR fijo del aula"
          >
            <Icon name="camera" size={14} />
            <span>Escanear QR</span>
          </button>
          {currentCourse && (
            <>
              <button
                onClick={() => setSelectedQrCourse(currentCourse)}
                className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                title="Ver e imprimir el QR fijo de esta aula"
              >
                <Icon name="qrCode" size={13} className="text-emerald-700" />
                <span>QR Fijo</span>
              </button>
              <button
                onClick={() => setIsDevicesModalOpen(true)}
                className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                title="Ver dispositivos de alumnos vinculados a esta aula"
              >
                <Icon name="kanban" size={13} />
                <span>Dispositivos</span>
              </button>
            </>
          )}
          <a
            href={`/docente/actividades/nueva?courseId=${currentCourse?.id || ''}`}
            className="flex items-center gap-1.5 bg-emerald-750 hover:bg-emerald-850 text-white rounded-xl px-3.5 py-2 text-xs font-bold shadow-2xs hover:shadow-xs transition-all"
          >
            <Icon name="fileText" size={13} />
            <span>Subir Lectura</span>
          </a>
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Icon name="activity" size={13} />
            <span>Comparar</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Icon name="download" size={13} />
            <span>{exporting ? 'Exportando…' : 'Exportar'}</span>
          </button>
        </div>
      </div>

      {}
      <div className="bg-stone-100 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-600 dark:text-stone-300 mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          {currentCourse ? (
            <>
              Aula: <strong className="text-slate-900 dark:text-white">{currentCourse.name}</strong>
              {currentCourse.room && <> · Salón: <strong>{currentCourse.room}</strong></>}
              {currentCourse.qrCode && <> · QR: <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">{currentCourse.qrCode}</span></>}
              {summary && <> · {summary.studentCount} alumnos</>}
            </>
          ) : (
            summary && `Comprensión lectora · ${summary.courseName} · ${summary.studentCount} alumnos`
          )}
        </div>
        {aiUsage && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <Icon name="sparkles" size={12} className="text-emerald-700" />
            <span>IA: <strong>{aiUsage.used}</strong>/{aiUsage.quota}</span>
          </div>
        )}
      </div>

      {compareOpen && summary && (
        <div className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-2xl p-5 mb-5 shadow-xs">
          <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            Comparar desempeño formativo entre dos períodos
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <input type="date" value={range.fromA} onChange={(e) => setRange((r) => ({ ...r, fromA: e.target.value }))} className="border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs bg-stone-50 dark:bg-stone-900" />
            <input type="date" value={range.toA} onChange={(e) => setRange((r) => ({ ...r, toA: e.target.value }))} className="border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs bg-stone-50 dark:bg-stone-900" />
            <input type="date" value={range.fromB} onChange={(e) => setRange((r) => ({ ...r, fromB: e.target.value }))} className="border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs bg-stone-50 dark:bg-stone-900" />
            <input type="date" value={range.toB} onChange={(e) => setRange((r) => ({ ...r, toB: e.target.value }))} className="border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs bg-stone-50 dark:bg-stone-900" />
          </div>
          <button onClick={handleCompare} disabled={comparing} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer">
            {comparing ? 'Comparando períodos…' : 'Ejecutar Comparación'}
          </button>

          {comparison && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
              {(['literal', 'inferencial', 'critico'] as const).map((axis) => (
                <div key={axis} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center border border-stone-200/80">
                  <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{axis}</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {pct(comparison.periodA.averages[axis])} → {pct(comparison.periodB.averages[axis])}
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${(comparison.delta[axis] ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {deltaPts(comparison.delta[axis])}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MetricCard value={pct(summary.averages.literal)} label="Comprensión Literal" color="var(--color-green-mid)" />
            <MetricCard value={pct(summary.averages.inferencial)} label="Comprensión Inferencial" color="var(--color-amber)" />
            <MetricCard value={pct(summary.averages.critico)} label="Comprensión Crítica" color="var(--color-red)" />
            <MetricCard value={String(summary.activityCount)} label="Actividades Completadas" />
          </div>

          {summary.pendingReviews > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3.5 py-2.5 mb-4">
              <Icon name="edit" size={13} />
              Hay {summary.pendingReviews} respuestas escritas sin revisar. El eje crítico de esos alumnos figura como
              pendiente hasta que confirmes el puntaje (botón «Revisar respuestas» en cada actividad).
            </div>
          )}

          <CourseInsightsPanel courseId={summary.courseId} refreshKey={insightsKey} />

          <div className="mb-6">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
              Rendimiento por Alumno en el Aula
            </div>
            <TableWrap>
              <thead>
                <tr className="bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-800">
                  <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Alumno</th>
                  <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Literal</th>
                  <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Inferencial</th>
                  <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Crítico</th>
                  <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Estado Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
                {pagedRows.pageItems.map((row) => (
                  <tr
                    key={row.studentId}
                    onClick={() => (window.location.href = `/docente/alumnos?id=${row.studentId}`)}
                    className={`cursor-pointer hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${row.status === 'bajo' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.studentName}</td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium">{pct(row.scores?.literal)}</td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium">{pct(row.scores?.inferencial)}</td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium">{row.criticoPending ? <span className="text-amber-700 text-xs font-semibold">pendiente</span> : pct(row.scores?.critico)}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusBadge[row.status].color}>{statusBadge[row.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination page={pagedRows.page} totalPages={pagedRows.totalPages} total={pagedRows.total} pageSize={pagedRows.pageSize} onChange={pagedRows.setPage} label="alumnos" />
          </div>
        </>
      )}

      <div className="mt-8 mb-6">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
          Actividades Asignadas al Aula
        </div>
        <TableWrap>
          <thead>
            <tr className="bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-800">
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Actividad</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Código</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Disponible desde</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Estado</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
            {activities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-xs text-stone-500 text-center">
                  Todavía no creaste actividades para este curso. Hacé clic en "Subir Lectura" para comenzar.
                </td>
              </tr>
            )}
            {pagedActivities.pageItems.map((act) => (
              <tr key={act.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{act.name}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">{act.code}</td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-400 text-xs">{act.availableFrom}</td>
                <td className="px-4 py-3">
                  <Badge color={activityStatusBadge[act.status].color}>{activityStatusBadge[act.status].label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicate(act.id)}
                      disabled={busyActivityId === act.id}
                      className="flex items-center gap-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Icon name="copy" size={11} />
                      <span>Duplicar</span>
                    </button>
                    {act.status !== 'borrador' && (
                      <a
                        href={`/docente/actividades/vivo?id=${act.id}`}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors ${
                          act.status === 'cerrada'
                            ? 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-slate-700 dark:text-slate-300'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {act.status === 'cerrada' ? <Icon name="eye" size={11} /> : <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        <span>{act.status === 'cerrada' ? 'Ver' : 'En vivo'}</span>
                      </a>
                    )}
                    {(act.status === 'publicada' || act.status === 'cerrada') && (
                      <button
                        onClick={() => setReviewActivity({ id: act.id, name: act.name })}
                        className="flex items-center gap-1.5 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Icon name="edit" size={11} />
                        <span>Revisar respuestas</span>
                      </button>
                    )}
                    {act.status !== 'cerrada' && (
                      <button
                        onClick={() => handleSaveToBank(act.id, act.name)}
                        disabled={busyActivityId === act.id}
                        title="Guarda el texto, las preguntas y el documento para reutilizarla"
                        className="flex items-center gap-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Icon name="layers" size={11} />
                        <span>Guardar en el banco</span>
                      </button>
                    )}
                    {act.status === 'publicada' && (
                      <button
                        onClick={() => handleCloseNow(act.id)}
                        disabled={busyActivityId === act.id}
                        className="flex items-center gap-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        <Icon name="lock" size={11} />
                        <span>Cerrar</span>
                      </button>
                    )}
                    {act.status === 'programada' && (
                      <button
                        onClick={() => handlePublishNow(act.id)}
                        disabled={busyActivityId === act.id}
                        className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <span>Publicar ahora</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pagination page={pagedActivities.page} totalPages={pagedActivities.totalPages} total={pagedActivities.total} pageSize={pagedActivities.pageSize} onChange={pagedActivities.setPage} label="actividades" />
      </div>

      {}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCourseDetected={handleCourseScanned}
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
      <ReviewAnswersModal
        activity={reviewActivity}
        isOpen={Boolean(reviewActivity)}
        onClose={() => setReviewActivity(null)}
        onReviewed={handleReviewed}
      />
    </div>
  );
}
