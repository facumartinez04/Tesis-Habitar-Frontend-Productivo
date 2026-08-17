import { useEffect, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { getStudentDetail } from '../../../services/studentService';
import { createFeedback, listFeedback, type Feedback } from '../../../services/feedbackService';
import type { StudentDetail, StudentTrendPoint } from '../../../types/student';

const statusBadge = {
  bien: { label: 'Bien', color: 'green' as const },
  regular: { label: 'Regular', color: 'amber' as const },
  bajo: {
    label: (
      <span className="flex items-center gap-1">
        <Icon name="alertTriangle" size={11} />
        Rendimiento bajo
      </span>
    ),
    color: 'red' as const,
  },
  sin_datos: { label: 'Sin datos', color: 'gray' as const },
};

const axisColor = { literal: '#1D9E75', inferencial: '#EF9F27', critico: '#E24B4A' };

function buildLine(trend: StudentTrendPoint[], key: 'literal' | 'inferencial' | 'critico') {
  if (trend.length === 0) return '';
  const stepX = 430 / Math.max(trend.length - 1, 1);
  return trend
    .map((point, i) => {
      const x = 60 + i * stepX;
      const y = 100 - (point[key] / 100) * 90;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function StudentDetailScreen() {
  const session = useAuthGuard(['docente', 'coordinador', 'admin']);
  const studentId = useQueryParam('id');
  const [student, setStudent] = useState<StudentDetail | null>(null);
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

  if (!session || !student) return <div className="text-xs text-text-ter">Cargando…</div>;

  const badge = statusBadge[student.status];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <a href="/docente/cursos" className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs shrink-0">
          <Icon name="arrowLeft" size={13} />
          {student.courseName}
        </a>
        <Avatar initials={student.initials} bg="var(--color-amber-bg)" color="var(--color-amber-text)" />
        <div className="min-w-0">
          <div className="text-[15px] font-medium truncate">{student.name}</div>
          <div className="text-[11.5px] text-text-sec truncate">{student.courseName} · {student.activitiesAnswered} actividades respondidas</div>
        </div>
        <Badge color={badge.color} className="sm:ml-auto">{badge.label}</Badge>
      </div>

      <div className="text-xs font-medium text-text-sec mb-2">Evolución por eje · trimestre</div>
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
          <div className="text-xs text-text-ter text-center py-6">Sin datos suficientes para graficar la evolución</div>
        )}
        <div className="flex gap-3.5 mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.literal }} /> Literal
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.inferencial }} /> Inferencial
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
            <span className="w-5 h-0.5 rounded-sm" style={{ background: axisColor.critico }} /> Crítico
          </div>
        </div>
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Actividad</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Fecha</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Literal</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Inferencial</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Crítico</th>
          </tr>
        </thead>
        <tbody>
          {student.history.map((row) => (
            <tr key={row.activityName + row.date}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.activityName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.date}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores.literal}%</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores.inferencial}%</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{row.scores.critico}%</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="mt-5">
        <div className="text-xs font-medium text-text-sec mb-2">CU-03-06 · Retroalimentación</div>
        <div className="bg-white border border-gray-border rounded-md p-3.5">
          <div className="flex gap-2 mb-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribí una devolución para el/la alumno/a…"
              className="flex-1 border border-gray-border rounded-md px-2.5 py-1.5 text-[12px]"
            />
            <button
              onClick={handleSendFeedback}
              disabled={sending || !newMessage.trim()}
              className="bg-green-dark text-white text-[12px] px-3 py-1.5 rounded-md disabled:opacity-50 shrink-0"
            >
              {sending ? 'Enviando…' : 'Registrar'}
            </button>
          </div>
          {feedback.length === 0 ? (
            <div className="text-[11.5px] text-text-ter">Todavía no hay retroalimentación registrada.</div>
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
