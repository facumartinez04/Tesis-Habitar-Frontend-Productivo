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

export function InstitutionDashboard() {
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard Institucional
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {summary.institutionName} · {summary.courses.length} aulas activas en seguimiento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            <option value="bien">Bien</option>
            <option value="regular">Regular</option>
            <option value="bajo">En riesgo (Bajo)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard value={`${summary.averages.literal}%`} label="Promedio Literal" color="var(--color-green-mid)" />
        <MetricCard value={`${summary.averages.inferencial}%`} label="Promedio Inferencial" color="var(--color-amber)" />
        <MetricCard value={`${summary.averages.critico}%`} label="Promedio Crítico" color="var(--color-red)" />
        <MetricCard value={String(summary.totalActivities)} label="Actividades Globales" />
      </div>

      <div className="mb-6">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
          Desempeño por Curso y Asignación Docente
        </div>
        <TableWrap>
          <thead>
            <tr className="bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-800">
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Curso / Aula</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Docente a Cargo</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Literal</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Inferencial</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Crítico</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">Diagnóstico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
            {courses.map((course) => (
              <tr key={course.courseId} className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${course.status === 'bajo' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{course.courseName}</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{course.teacherName || 'Sin asignar'}</span>
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
                        title="Reasignar docente a este curso"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{course.averages.literal}%</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{course.averages.inferencial}%</td>
                <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium text-xs">{course.averages.critico}%</td>
                <td className="px-4 py-3">
                  <Badge color={statusBadge[course.status].color}>{statusBadge[course.status].label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

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
