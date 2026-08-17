import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { MetricCard } from '../ui/MetricCard';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { getInstitutionSummary } from '../../../services/resultsService';
import type { InstitutionResultSummary, PerformanceStatus } from '../../../types/result';

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

  useEffect(() => {
    if (session) getInstitutionSummary(session.user.institutionId).then(setSummary);
  }, [session]);

  if (!session || !summary) {
    return <div className="text-xs text-text-ter">Cargando…</div>;
  }

  const courses = levelFilter === 'todos' ? summary.courses : summary.courses.filter((c) => c.status === levelFilter);

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Dashboard institucional</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {summary.institutionName} · {summary.courses.length} cursos activos
      </div>

      <div className="flex gap-2 mb-[18px]">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="form-select bg-white border border-gray-border rounded-[6px] text-xs px-2.5 py-1.5"
        >
          <option value="todos">Todos los estados</option>
          <option value="bien">Bien</option>
          <option value="regular">Regular</option>
          <option value="bajo">Bajo</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-[18px]">
        <MetricCard value={`${summary.averages.literal}%`} label="Prom. literal" color="var(--color-green-mid)" />
        <MetricCard value={`${summary.averages.inferencial}%`} label="Prom. inferencial" color="var(--color-amber)" />
        <MetricCard value={`${summary.averages.critico}%`} label="Prom. crítico" color="var(--color-red)" />
        <MetricCard value={String(summary.totalActivities)} label="Actividades" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Curso</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Docente</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Literal</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Inferencial</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Crítico</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.courseId} className={course.status === 'bajo' ? 'bg-red-bg/10' : ''}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{course.courseName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{course.teacherName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{course.averages.literal}%</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{course.averages.inferencial}%</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{course.averages.critico}%</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={statusBadge[course.status].color}>{statusBadge[course.status].label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
