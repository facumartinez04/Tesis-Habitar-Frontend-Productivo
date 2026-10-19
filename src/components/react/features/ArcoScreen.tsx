import { useEffect, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { deleteStudentData, exportStudentData, getAuditLog, searchArcoStudents } from '../../../services/complianceService';
import { confirmDestructive } from '../../../lib/alerts';
import type { ArcoStudentRecord, AuditLogEntry } from '../../../types/compliance';

const operationBadge: Record<AuditLogEntry['operation'], { label: string; color: 'blue' | 'red' | 'green' }> = {
  exportacion: { label: 'Exportación', color: 'blue' },
  eliminacion: { label: 'Eliminación', color: 'red' },
  consentimiento: { label: 'Consentimiento', color: 'green' },
};

export function ArcoScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const { message, showToast } = useToast();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<ArcoStudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const pagedAuditLog = usePagination(auditLog, 15, null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!session) return;
    const institutionId = session.user.institutionId;
    const [studentResults, log] = await Promise.all([searchArcoStudents(institutionId, query), getAuditLog(institutionId)]);
    setStudents(studentResults);
    setAuditLog(log);
    if (!studentResults.find((s) => s.id === selectedId)) {
      setSelectedId(studentResults[0]?.id ?? null);
    }
  }

  useEffect(() => {
    refresh();

  }, [session]);

  const selected = students.find((s) => s.id === selectedId) ?? null;

  async function handleExport() {
    if (!selected || !session) return;
    setBusy(true);
    const blob = await exportStudentData(session.user.institutionId, selected.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    await refresh();
    setBusy(false);
    showToast('Datos exportados');
  }

  async function handleDelete() {
    if (!selected || !session) return;
    const confirmed = await confirmDestructive({
      title: `¿Eliminar los datos de ${selected.name}?`,
      text: 'Esta acción no se puede deshacer y quedará registrada en el log de auditoría.',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!confirmed) return;
    setBusy(true);
    await deleteStudentData(session.user.institutionId, selected.id);
    await refresh();
    setBusy(false);
    showToast('Datos eliminados');
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-3.5 w-96" />
        </div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="md:col-span-2">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Cumplimiento — Datos personales (ARCO)</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        Solicitudes de acceso, rectificación, cancelación u oposición · Ley 25.326
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && refresh()}
          placeholder="Nombre o número de lista..."
          className="flex-1 px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
        />
        <button onClick={refresh} className="flex items-center gap-1.5 bg-green-dark text-white rounded-[6px] px-4 py-2 text-[12.5px] font-medium">
          <Icon name="search" size={14} />
          Buscar
        </button>
      </div>

      {selected ? (
        <Card className="mb-4">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Avatar initials={selected.name.slice(0, 2).toUpperCase()} bg="var(--color-blue-bg)" color="var(--color-blue)" />
            <div>
              <div className="text-[13px] font-medium">{selected.name} · {selected.courseName}</div>
              <div className="text-[11.5px] text-text-sec">
                {selected.activitiesCount} actividades registradas · Última: {selected.lastActivityDate ?? '—'}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExport}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-border rounded-[6px] py-2 text-[12.5px] disabled:opacity-50"
            >
              <Icon name="download" size={14} />
              Exportar datos (JSON)
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-bg border border-[#F09595] text-red-text rounded-[6px] py-2 text-[12.5px] disabled:opacity-50"
            >
              <Icon name="trash" size={14} />
              Eliminar datos
            </button>
          </div>
        </Card>
      ) : (
        <div className="text-xs text-text-ter mb-4">No se encontraron alumnos para esa búsqueda.</div>
      )}

      <div className="text-xs font-medium text-text-sec mb-2">Registro de auditoría</div>
      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Fecha</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Alumno</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Operación</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {pagedAuditLog.pageItems.map((entry) => (
            <tr key={entry.id}>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{entry.date}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{entry.studentName}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={operationBadge[entry.operation].color}>{operationBadge[entry.operation].label}</Badge>
              </td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">{entry.performedBy}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={pagedAuditLog.page} totalPages={pagedAuditLog.totalPages} total={pagedAuditLog.total} pageSize={pagedAuditLog.pageSize} onChange={pagedAuditLog.setPage} label="registros" />
    </div>
  );
}
