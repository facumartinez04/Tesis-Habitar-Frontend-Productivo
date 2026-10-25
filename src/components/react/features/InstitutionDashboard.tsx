import { pct } from '../../../lib/scores';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { UsageMetricsPanel } from './UsageMetricsPanel';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { MetricCard } from '../ui/MetricCard';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { getInstitutionSummary } from '../../../services/resultsService';
import type { InstitutionResultSummary, PerformanceStatus } from '../../../types/result';

import { Skeleton, SkeletonMetricCards, SkeletonTable } from '../ui/Skeleton';
import { listInstitutionUsers, type InstitutionUser } from '../../../services/institutionUsersService';
import { ReassignCourseTeacherModal } from './ReassignCourseTeacherModal';
import type { Course } from '../../../types/activity';
import { t, useI18n } from '../../../i18n';
import { T } from '../../../i18n/T';
import { HelpTip } from '../ui/HelpTip';
import { OnboardingTour, institutionTourSteps } from './OnboardingTour';

const statusBadge: Record<PerformanceStatus, { label: ReactNode; color: 'green' | 'amber' | 'red' | 'gray' }> = {
  bien: { label: <T k={'Bien'} />, color: 'green' },
  regular: { label: <T k={'Regular'} />, color: 'amber' },
  bajo: {
    label: (
      <span className="flex items-center gap-1">
        <Icon name="alertTriangle" size={11} />
        <T k={'Bajo'} />
      </span>
    ),
    color: 'red',
  },
  sin_datos: { label: <T k={'Sin datos'} />, color: 'gray' },
};

export function InstitutionDashboard() {
  useI18n();
  const session = useAuthGuard(['coordinador', 'admin']);
  const [summary, setSummary] = useState<InstitutionResultSummary | null>(null);
  const [levelFilter, setLevelFilter] = useState('todos');
  const [teachers, setTeachers] = useState<InstitutionUser[]>([]);
  const [reassigningCourse, setReassigningCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (session) {
      getInstitutionSummary(session.user.institutionId).then(setSummary);
      listInstitutionUsers(session.user.institutionId)
        .then((users) => setTeachers(users.filter((u) => u.role === 'docente' && u.active)))
        .catch(() => {});
    }
  }, [session]);
  const pagedCourses = usePagination((levelFilter === 'todos' ? summary?.courses ?? [] : (summary?.courses ?? []).filter((c) => c.status === levelFilter)), 15, levelFilter);

  if (!session || !summary) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <SkeletonMetricCards count={4} />
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  const courses = levelFilter === 'todos' ? summary.courses : summary.courses.filter((c) => c.status === levelFilter);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {t('Dashboard Institucional')}
            <HelpTip
              title={t('Dashboard institucional')}
              text={t('Resume la comprensión lectora de todos los cursos de la institución. Sirve para detectar cursos en riesgo y decidir dónde acompañar a los docentes.')}
            />
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t('{institutionName} · {coursesCount} aulas activas en seguimiento', { institutionName: summary.institutionName, coursesCount: summary.courses.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            data-tour="inst-filter"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all cursor-pointer"
          >
            <option value="todos">{t('Todos los estados')}</option>
            <option value="bien">{t('Bien')}</option>
            <option value="regular">{t('Regular')}</option>
            <option value="bajo">{t('En riesgo (Bajo)')}</option>
          </select>
          <a
            data-tour="inst-manage-courses"
            href="/institucional/aulas"
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all"
          >
            <Icon name="plus" size={13} />
            <span>{t('Gestionar Aulas')}</span>
          </a>
        </div>
      </div>

      <div data-tour="inst-metrics" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard value={pct(summary.averages.literal)} label={t('Promedio Literal')} color="var(--color-green-mid)" help={t('Promedio de todos los cursos en las preguntas cuya respuesta está escrita en el texto.')} />
        <MetricCard value={pct(summary.averages.inferencial)} label={t('Promedio Inferencial')} color="var(--color-amber)" help={t('Promedio de todos los cursos en las preguntas que piden relacionar ideas y sacar conclusiones.')} />
        <MetricCard value={pct(summary.averages.critico)} label={t('Promedio Crítico')} color="var(--color-red)" help={t('Promedio de las respuestas abiertas ya corregidas por los docentes, en las que el alumno opina con argumentos del texto.')} />
        <MetricCard value={String(summary.totalActivities)} label={t('Actividades Globales')} help={t('Total de actividades de lectura creadas en la institución.')} />
      </div>

      <div className="mb-6" data-tour="inst-courses-table">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          {t('Desempeño por Curso y Asignación Docente')}
          <HelpTip
            text={t('Cada curso con su docente y el promedio de los tres ejes. Con el lápiz podés reasignar el docente. El filtro de arriba muestra sólo los cursos en un estado.')}
          />
        </div>
        <TableWrap>
          <thead>
            <tr className="bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-800">
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Curso / Aula')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Docente a Cargo')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Literal')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Inferencial')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Crítico')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Diagnóstico')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
            {pagedCourses.pageItems.map((course) => (
              <tr key={course.courseId} className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${course.status === 'bajo' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{course.courseName}</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{course.teacherName || t('Sin asignar')}</span>
                    {teachers.length > 0 && (
                      <button
                        onClick={() =>
                          setReassigningCourse({
                            id: course.courseId,
                            name: course.courseName,
                            subject: '',
                            teacherId: '',
                            teacherName: course.teacherName,
                          })
                        }
                        className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        title={t('Reasignar docente a este curso')}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{pct(course.averages.literal)}</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{pct(course.averages.inferencial)}</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{pct(course.averages.critico)}</td>
                <td className="px-4 py-3">
                  <Badge color={statusBadge[course.status].color}>{statusBadge[course.status].label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pagination page={pagedCourses.page} totalPages={pagedCourses.totalPages} total={pagedCourses.total} pageSize={pagedCourses.pageSize} onChange={pagedCourses.setPage} label={t('cursos')} />
      </div>

      <div className="mt-6" data-tour="inst-usage">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          {t('Uso del producto')}
          <HelpTip
            text={t('Muestra cuánto se usa Habitar en la institución: docentes activos, actividades y respuestas. Ayuda a ver si la plataforma se está adoptando en las aulas.')}
          />
        </div>
        <UsageMetricsPanel institutionId={session.user.institutionId} />
      </div>

      <OnboardingTour tourId="institucional" steps={institutionTourSteps()} />

      {reassigningCourse && (
        <ReassignCourseTeacherModal
          course={reassigningCourse}
          teachers={teachers}
          onClose={() => setReassigningCourse(null)}
          onSaved={() => {
            if (session) getInstitutionSummary(session.user.institutionId).then(setSummary);
          }}
        />
      )}

    </div>
  );
}
