import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { SkeletonTable } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../../../hooks/useToast';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { useServerPage } from '../../../hooks/usePagination';
import { ensureAdminSession } from '../../../services/authService';
import { getInstitutionBySlug } from '../../../services/institutionService';
import { apiFetch } from '../../../lib/apiClient';
import { confirmDestructive, showError } from '../../../lib/alerts';
import type { Institution } from '../../../types/institution';

type Tab = 'activities' | 'courses' | 'students' | 'deletions';

interface ActivityRow {
  id: string;
  code: string;
  name: string;
  status: string;
  courseName: string;
  createdAt: string;
  responses: number;
}
interface CourseRow {
  id: string;
  name: string;
  subject: string;
  teacherName: string | null;
  students: number;
  activities: number;
  responses: number;
}
interface StudentRow {
  id: string;
  name: string;
  courseName: string;
  results: number;
  createdAt: string;
}
interface DeletionRow {
  id: string;
  kind: 'ACTIVIDAD' | 'AULA' | 'ALUMNO';
  targetName: string;
  details: Record<string, unknown>;
  performedBy: string;
  createdAt: string;
}

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name']; search: string }[] = [
  { id: 'activities', label: 'Actividades', icon: 'fileText', search: 'Buscar por nombre, código o aula…' },
  { id: 'courses', label: 'Aulas', icon: 'school', search: 'Buscar por aula o materia…' },
  { id: 'students', label: 'Alumnos', icon: 'users', search: 'Buscar por alumno o aula…' },
  { id: 'deletions', label: 'Historial de borrados', icon: 'refresh', search: 'Buscar por nombre o por quién borró…' },
];

const STATUS: Record<string, { label: string; color: 'green' | 'amber' | 'gray' }> = {
  PUBLICADA: { label: 'Abierta', color: 'green' },
  PROGRAMADA: { label: 'Programada', color: 'amber' },
  CERRADA: { label: 'Cerrada', color: 'gray' },
  BORRADOR: { label: 'Borrador', color: 'gray' },
};

const KIND_LABEL: Record<DeletionRow['kind'], string> = { ACTIVIDAD: 'Actividad', AULA: 'Aula', ALUMNO: 'Alumno' };

function dateOf(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function detailsText(d: DeletionRow): string {
  const x = d.details as { responses?: number; activities?: number; students?: number; results?: number; course?: string };
  if (d.kind === 'ACTIVIDAD') return plural(x.responses ?? 0, 'respuesta', 'respuestas');
  if (d.kind === 'AULA')
    return [plural(x.activities ?? 0, 'actividad', 'actividades'), plural(x.students ?? 0, 'alumno', 'alumnos'), plural(x.responses ?? 0, 'respuesta', 'respuestas')].join(' · ');
  return `${x.course ?? ''}${x.course ? ' · ' : ''}${plural(x.results ?? 0, 'resultado', 'resultados')}`;
}

const th = 'text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white';
const td = 'px-2.5 py-2.5 border-b border-gray-border';

/**
 * Datos de una institución para el administrador de la plataforma: actividades, aulas y alumnos paginados, con
 * borrado definitivo. Cada borrado queda en el historial con quién lo hizo y qué arrastró.
 */
export function AdminInstitutionDataScreen() {
  const slug = useQueryParam('slug', '');
  const { message, showToast } = useToast();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('activities');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    ensureAdminSession()
      .then(() => getInstitutionBySlug(slug))
      .then(setInstitution)
      .catch(() => setNotFound(true));
  }, [slug]);

  const list = useServerPage<ActivityRow | CourseRow | StudentRow | DeletionRow>(
    institution ? `/admin/institutions/${institution.id}/${tab}` : null,
    15,
  );

  function switchTab(next: Tab) {
    setTab(next);
    list.setSearch('');
    list.setPage(1);
  }

  async function remove(kind: 'activities' | 'courses' | 'students', id: string, title: string, text: string, done: (r: Record<string, number>) => string) {
    const ok = await confirmDestructive({ title, text: `${text} No se puede deshacer.`, confirmButtonText: 'Sí, borrar definitivamente' });
    if (!ok) return;
    setDeleting(id);
    try {
      const result = await apiFetch<Record<string, number>>(`/admin/${kind}/${id}`, { method: 'DELETE' });
      showToast(done(result));
      list.reload();
    } catch (err) {
      await showError('No se pudo borrar', err instanceof Error ? err.message : undefined);
    } finally {
      setDeleting(null);
    }
  }

  if (notFound || !slug) {
    return <div className="text-sm text-text-sec">No se encontró la institución. Volvé al listado de instituciones.</div>;
  }

  const current = TABS.find((t) => t.id === tab)!;
  const items = list.data?.items ?? [];
  const delBtn =
    'inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40 rounded-[6px] px-2 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 cursor-pointer';

  return (
    <div>
      <a href="/admin/instituciones" className="inline-flex items-center gap-1 text-[11.5px] text-text-sec hover:text-text-pri mb-2">
        <Icon name="arrowLeft" size={12} />
        Instituciones
      </a>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Datos de {institution?.name ?? '…'}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        Revisá y borrá actividades, aulas o alumnos de esta institución. Los borrados son definitivos y quedan registrados.
      </div>

      <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px cursor-pointer ${
              tab === t.id ? 'border-emerald-600 text-text-pri' : 'border-transparent text-text-sec hover:text-text-pri'
            }`}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
            {tab === t.id && list.data && <span className="text-[10.5px] text-text-ter tabular-nums">{list.data.total}</span>}
          </button>
        ))}
      </div>

      <div className="relative mb-3 max-w-[340px]">
        <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
        <input
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          placeholder={current.search}
          className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
        />
      </div>

      {list.error && <div className="text-xs text-red mb-2">{list.error}</div>}

      {!list.data ? (
        <SkeletonTable />
      ) : (
        <div className={list.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <TableWrap>
            {tab === 'activities' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>Actividad</th>
                    <th className={th}>Aula</th>
                    <th className={th}>Estado</th>
                    <th className={th}>Respuestas</th>
                    <th className={th}>Creada</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {(items as ActivityRow[]).map((a) => (
                    <tr key={a.id}>
                      <td className={td}>
                        <div className="font-medium">{a.name}</div>
                        <div className="font-mono text-[10.5px] text-text-ter">{a.code}</div>
                      </td>
                      <td className={`${td} text-text-sec`}>{a.courseName}</td>
                      <td className={td}>
                        <Badge color={STATUS[a.status]?.color ?? 'gray'}>{STATUS[a.status]?.label ?? a.status}</Badge>
                      </td>
                      <td className={`${td} tabular-nums`}>{a.responses}</td>
                      <td className={`${td} text-text-sec text-[11.5px] tabular-nums`}>{dateOf(a.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          className={delBtn}
                          disabled={deleting === a.id}
                          onClick={() =>
                            remove(
                              'activities',
                              a.id,
                              `¿Borrar «${a.name}»?`,
                              `Se borran la actividad, sus preguntas y ${plural(a.responses, 'respuesta', 'respuestas')} con sus resultados.`,
                              (r) => `Actividad borrada (${plural(r.responses ?? 0, 'respuesta', 'respuestas')})`,
                            )
                          }
                        >
                          <Icon name="trash" size={11} />
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'courses' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>Aula</th>
                    <th className={th}>Docente</th>
                    <th className={th}>Alumnos</th>
                    <th className={th}>Actividades</th>
                    <th className={th}>Respuestas</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {(items as CourseRow[]).map((c) => (
                    <tr key={c.id}>
                      <td className={td}>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[10.5px] text-text-ter">{c.subject}</div>
                      </td>
                      <td className={`${td} text-text-sec`}>{c.teacherName ?? '—'}</td>
                      <td className={`${td} tabular-nums`}>{c.students}</td>
                      <td className={`${td} tabular-nums`}>{c.activities}</td>
                      <td className={`${td} tabular-nums`}>{c.responses}</td>
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          className={delBtn}
                          disabled={deleting === c.id}
                          onClick={() =>
                            remove(
                              'courses',
                              c.id,
                              `¿Borrar el aula «${c.name}»?`,
                              `Se borran ${plural(c.activities, 'actividad', 'actividades')}, ${plural(c.students, 'alumno', 'alumnos')} y ${plural(c.responses, 'respuesta', 'respuestas')}, además de sus alertas y celulares vinculados.`,
                              (r) => `Aula borrada (${plural(r.activities ?? 0, 'actividad', 'actividades')}, ${plural(r.students ?? 0, 'alumno', 'alumnos')})`,
                            )
                          }
                        >
                          <Icon name="trash" size={11} />
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'students' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>Alumno</th>
                    <th className={th}>Aula</th>
                    <th className={th}>Resultados</th>
                    <th className={th}>Alta</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {(items as StudentRow[]).map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} font-medium`}>{s.name}</td>
                      <td className={`${td} text-text-sec`}>{s.courseName}</td>
                      <td className={`${td} tabular-nums`}>{s.results}</td>
                      <td className={`${td} text-text-sec text-[11.5px] tabular-nums`}>{dateOf(s.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          className={delBtn}
                          disabled={deleting === s.id}
                          onClick={() =>
                            remove(
                              'students',
                              s.id,
                              `¿Borrar a ${s.name} de ${s.courseName}?`,
                              `Se borran sus respuestas y ${plural(s.results, 'resultado', 'resultados')}.`,
                              () => 'Alumno borrado',
                            )
                          }
                        >
                          <Icon name="trash" size={11} />
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'deletions' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>Fecha</th>
                    <th className={th}>Qué</th>
                    <th className={th}>Nombre</th>
                    <th className={th}>Arrastró</th>
                    <th className={th}>Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as DeletionRow[]).map((d) => (
                    <tr key={d.id}>
                      <td className={`${td} text-text-sec text-[11.5px] tabular-nums whitespace-nowrap`}>{dateOf(d.createdAt)}</td>
                      <td className={td}>
                        <Badge color="gray">{KIND_LABEL[d.kind]}</Badge>
                      </td>
                      <td className={`${td} font-medium`}>{d.targetName}</td>
                      <td className={`${td} text-text-sec text-[11.5px]`}>{detailsText(d)}</td>
                      <td className={`${td} text-text-sec`}>{d.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {items.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-2.5 py-6 text-center text-text-ter text-[12px]">
                    {list.search ? 'No hay resultados para la búsqueda.' : tab === 'deletions' ? 'Todavía no se borró nada.' : 'No hay datos.'}
                  </td>
                </tr>
              </tbody>
            )}
          </TableWrap>
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            pageSize={list.data.pageSize}
            onChange={list.setPage}
            label={current.label.toLowerCase()}
          />
        </div>
      )}
      <Toast message={message} />
    </div>
  );
}
