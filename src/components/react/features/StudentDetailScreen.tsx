import { pct } from '../../../lib/scores';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { useEffect, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Skeleton, SkeletonMetricCards, SkeletonCard } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { getStudentDetail } from '../../../services/studentService';
import { createFeedback, listFeedback, type Feedback } from '../../../services/feedbackService';
import type { StudentDetail, StudentTrendPoint } from '../../../types/student';
import { t, useI18n } from '../../../i18n';
import { T } from '../../../i18n/T';
import { MetricCard } from '../ui/MetricCard';

const statusBadge = {
  bien: { label: <T k={'Bien'} />, color: 'green' as const },
  regular: { label: <T k={'Regular'} />, color: 'amber' as const },
  bajo: {
    label: (
      <span className="flex items-center gap-1">
        <Icon name="alertTriangle" size={11} />
        <T k={'Rendimiento bajo'} />
      </span>
    ),
    color: 'red' as const,
  },
  sin_datos: { label: <T k={'Sin datos'} />, color: 'gray' as const },
};

const axisColor = { literal: '#1D9E75', inferencial: '#EF9F27', critico: '#E24B4A' };

function buildLine(trend: StudentTrendPoint[], key: 'literal' | 'inferencial' | 'critico') {
  if (trend.length === 0) return '';
  const stepX = 430 / Math.max(trend.length - 1, 1);
  return trend
    .map((point, i) => {
      const value = point[key];
      if (value === null) return null;
      const x = 60 + i * stepX;
      const y = 100 - (value / 100) * 90;
      return `${x},${y.toFixed(1)}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');
}

export function StudentDetailScreen() {
  useI18n();
  const session = useAuthGuard(['docente', 'coordinador', 'admin']);
  const studentId = useQueryParam('id');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const pagedHistory = usePagination(student?.history ?? [], 15, null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (studentId) {
      getStudentDetail(studentId).then((result) => setStudent(result ?? null));
      listFeedback(studentId).then(setFeedback);
    }
  }, [studentId]);

  async function handleSendFeedback() {
    if (!studentId || !newMessage.trim()) return;
    setSending(true);
    try {
      const created = await createFeedback(studentId, newMessage.trim());
      setFeedback((prev) => [created, ...prev]);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  }

  if (!session || !student) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <SkeletonMetricCards count={3} />
        <SkeletonCard />
      </div>
    );
  }

  const badge = statusBadge[student.status];
  const backHref = session.user.role === 'docente' ? `/docente/cursos?curso=${encodeURIComponent(student.courseId)}` : '/institucional';
  const average = (key: 'literal' | 'inferencial' | 'critico'): number | null => {
    const values = student.history.map((row) => row.scores[key]).filter((v): v is number => typeof v === 'number');
    return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
  };

  return (
    <div>
      <a
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 mb-3"
      >
        <Icon name="arrowLeft" size={13} />
        {t('Volver a {courseName}', { courseName: student.courseName })}
      </a>

      <div className="flex items-center gap-3 bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 mb-4">
        <Avatar initials={student.initials} bg="var(--color-amber-bg)" color="var(--color-amber-text)" size={46} />
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{student.name}</h1>
          <div className="text-[11.5px] text-text-sec">{t('{courseName} · {activitiesAnswered} actividades respondidas', { courseName: student.courseName, activitiesAnswered: student.activitiesAnswered })}</div>
          <div className="mt-1.5 sm:hidden">
            <Badge color={badge.color}>{badge.label}</Badge>
          </div>
        </div>
        <div className="hidden sm:block shrink-0">
          <Badge color={badge.color}>{badge.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard value={average('literal') === null ? '—' : `${average('literal')}%`} label={t('Literal')} color="var(--color-green-mid)" help={t('Promedio del alumno en las preguntas cuya respuesta está escrita en el texto.')} />
        <MetricCard value={average('inferencial') === null ? '—' : `${average('inferencial')}%`} label={t('Inferencial')} color="var(--color-amber)" help={t('Promedio del alumno en las preguntas que piden relacionar ideas y sacar conclusiones.')} />
        <MetricCard value={average('critico') === null ? '—' : `${average('critico')}%`} label={t('Crítico')} color="var(--color-red)" help={t('Promedio de sus respuestas abiertas ya revisadas por el docente.')} />
        <MetricCard value={String(student.activitiesAnswered)} label={t('Actividades respondidas')} />
      </div>

      <div className="text-xs font-medium text-text-sec mb-2">{t('Evolución por eje · trimestre')}</div>
      <div className="bg-surface rounded-md p-3.5 mb-4">
        {student.trend.length > 0 ? (
          <svg viewBox="0 0 500 120" className="w-full h-[120px]">
            <line x1="40" y1="10" x2="40" y2="100" stroke="#D8D5CE" strokeWidth="1" />
            <line x1="40" y1="100" x2="490" y2="100" stroke="#D8D5CE" strokeWidth="1" />
            <line x1="40" y1="55" x2="490" y2="55" stroke="#D8D5CE" strokeWidth="0.5" strokeDasharray="4,3" />
            <text x="2" y="14" fontSize="9" fill="#8C8A85">100%</text>
            <text x="8" y="58" fontSize="9" fill="#8C8A85">50%</text>
            <text x="8" y="103" fontSize="9" fill="#8C8A85">0%</text>
            <polyline points={buildLine(student.trend, 'literal')} fill="none" stroke={axisColor.literal} strokeWidth="2" strokeLinejoin="round" />
            <polyline points={buildLine(student.trend, 'inferencial')} fill="none" stroke={axisColor.inferencial} strokeWidth="2" strokeLinejoin="round" />
            <polyline points={buildLine(student.trend, 'critico')} fill="none" stroke={axisColor.critico} strokeWidth="2" strokeLinejoin="round" />
            {student.trend.map((point, i) => {
              const stepX = 430 / Math.max(student.trend.length - 1, 1);
              return (
                <text key={point.month} x={60 + i * stepX} y="113" fontSize="8" fill="#8C8A85" textAnchor="middle">
                  {point.month}
                </text>
              );
            })}
          </svg>
        ) : (
          <div className="text-xs text-text-ter text-center py-6">{t('Sin datos suficientes para graficar la evolución')}</div>
        )}
        <div className="flex gap-3.5 mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.literal }} />{' '}{t('Literal')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.inferencial }} />{' '}{t('Inferencial')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.critico }} />{' '}{t('Crítico')}
          </div>
        </div>
      </div>

      <div className="text-xs font-medium text-text-sec mb-2">{t('Historial de actividades')}</div>
      <div className="sm:hidden space-y-2">
        {pagedHistory.pageItems.length === 0 && (
          <div className="text-xs text-text-ter text-center py-4">{t('Todavía no respondió actividades.')}</div>
        )}
        {pagedHistory.pageItems.map((row) => (
          <div key={row.activityName + row.date} className="bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{row.activityName}</div>
              <div className="text-[11px] text-text-ter shrink-0">{row.date}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {(['literal', 'inferencial', 'critico'] as const).map((key) => (
                <div key={key} className="bg-surface rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[10px] text-text-ter uppercase tracking-wide">{t(key === 'literal' ? 'Literal' : key === 'inferencial' ? 'Inferencial' : 'Crítico')}</div>
                  <div className="text-[13px] font-bold tabular-nums" style={{ color: axisColor[key] }}>{pct(row.scores[key])}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block">
      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Actividad')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Fecha')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Literal')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Inferencial')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Crítico')}</th>
          </tr>
        </thead>
        <tbody>
          {pagedHistory.pageItems.map((row) => (
            <tr key={row.activityName + row.date}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.activityName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.date}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{pct(row.scores.literal)}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{pct(row.scores.inferencial)}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{pct(row.scores.critico)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      </div>
      <Pagination page={pagedHistory.page} totalPages={pagedHistory.totalPages} total={pagedHistory.total} pageSize={pagedHistory.pageSize} onChange={pagedHistory.setPage} label={t('actividades')} />

      <div className="mt-5">
        <div className="text-xs font-medium text-text-sec mb-2">{t('CU-03-06 · Retroalimentación')}</div>
        <div className="bg-white border border-gray-border rounded-md p-3.5">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('Escribí una devolución para el/la alumno/a…')}
              className="flex-1 border border-gray-border rounded-md px-2.5 py-2 text-[12px]"
            />
            <button
              onClick={handleSendFeedback}
              disabled={sending || !newMessage.trim()}
              className="bg-green-dark text-white text-[12px] px-3 py-2 rounded-md disabled:opacity-50 shrink-0"
            >
              {sending ? t('Enviando…') : t('Registrar')}
            </button>
          </div>
          {feedback.length === 0 ? (
            <div className="text-[11.5px] text-text-ter">{t('Todavía no hay retroalimentación registrada.')}</div>
          ) : (
            <div className="space-y-2">
              {feedback.map((item) => (
                <div key={item.id} className="bg-surface rounded-md px-2.5 py-2">
                  <div className="text-[12px] text-text-pri">{item.message}</div>
                  <div className="text-[10.5px] text-text-ter mt-1">{item.authorName} · {item.createdAt}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
