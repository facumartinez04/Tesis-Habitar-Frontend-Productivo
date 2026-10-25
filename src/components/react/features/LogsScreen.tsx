import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { SkeletonTable } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';
import { useServerPage } from '../../../hooks/usePagination';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { listInstitutions } from '../../../services/institutionService';
import { EMPTY_LOG_FILTERS, LOG_PAGE_SIZE, hasActiveFilters, logsPath } from '../../../services/logService';
import type { Institution } from '../../../types/institution';
import {
  EVENT_TYPE_LABEL,
  LOG_KINDS,
  LOG_TYPE_OPTIONS,
  ROLE_LABEL,
  type AuditLogEntry,
  type ErrorLogEntry,
  type EventCategory,
  type EventLogEntry,
  type LogFilters,
  type LogKind,
  type LogScope,
} from '../../../types/log';
import { t, useI18n, intlLocale } from '../../../i18n';

type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'teal';

const CATEGORY_COLOR: Record<EventCategory, BadgeColor> = {
  ACCESO: 'blue',
  SEGURIDAD: 'red',
  USUARIOS: 'teal',
  CONFIGURACION: 'amber',
  ACTIVIDADES: 'green',
  DATOS: 'gray',
  COMERCIAL: 'blue',
};

const ALERT_TYPES = new Set(['LOGIN_FALLIDO', 'ACCESO_DENEGADO', 'BORRADO_ADMIN', 'PURGA_DATOS']);

const OPERATION: Record<AuditLogEntry['operation'], { label: string; color: BadgeColor }> = {
  EXPORTACION: { label: 'Exportación', color: 'blue' },
  ELIMINACION: { label: 'Eliminación', color: 'red' },
  CONSENTIMIENTO: { label: 'Consentimiento', color: 'green' },
};

const KIND_ICON: Record<LogKind, 'activity' | 'shield' | 'alertTriangle'> = { eventos: 'activity', auditoria: 'shield', errores: 'alertTriangle' };

const SEARCH_PLACEHOLDER: Record<LogKind, string> = {
  eventos: 'Buscar por descripción, usuario o tipo…',
  auditoria: 'Buscar por alumno o por quién lo hizo…',
  errores: 'Buscar por mensaje, ruta o usuario…',
};

const th = 'text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white';
const td = 'px-2.5 py-2.5 border-b border-gray-border align-top';
const input = 'w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white dark:bg-[#131620] text-text-pri';

function dateOf(iso: string): string {
  return new Date(iso).toLocaleString(intlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function UserCell({ name, email, role, impersonated }: { name: string | null; email: string | null; role: string | null; impersonated?: boolean }) {
  useI18n();
  if (!name && !email) return <span className="text-text-ter">{t('Sistema o alumno')}</span>;
  return (
    <div className="min-w-0">
      <div className="text-text-pri font-medium truncate">{name ?? email}</div>
      {name && email && <div className="text-[11px] text-text-ter truncate">{email}</div>}
      <div className="flex flex-wrap gap-1 mt-0.5">
        {role && <span className="text-[10.5px] text-text-sec">{t(ROLE_LABEL[role] ?? role)}</span>}
        {impersonated && <Badge color="amber">{t('Impersonando')}</Badge>}
      </div>
    </div>
  );
}

interface LogsScreenProps {
  scope: LogScope;
}

export function LogsScreen({ scope }: LogsScreenProps) {
  useI18n();
  const global = scope === 'global';
  const session = useAuthGuard(global ? ['admin'] : ['coordinador', 'admin']);
  const [kind, setKind] = useState<LogKind>('eventos');
  const [filters, setFilters] = useState<Omit<LogFilters, 'q'>>(EMPTY_LOG_FILTERS);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    if (session && global) listInstitutions().then(setInstitutions).catch(() => setInstitutions([]));
  }, [session, global]);

  const path = useMemo(() => (session ? logsPath(kind, filters, global) : null), [session, kind, filters, global]);
  const list = useServerPage<EventLogEntry | ErrorLogEntry | AuditLogEntry>(path, LOG_PAGE_SIZE);

  function update(next: Partial<Omit<LogFilters, 'q'>>) {
    setFilters((current) => ({ ...current, ...next }));
    list.setPage(1);
  }

  function switchKind(next: LogKind) {
    setKind(next);
    setFilters((current) => ({ ...current, type: '' }));
    setOpenError(null);
    list.setSearch('');
    list.setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_LOG_FILTERS);
    list.setSearch('');
    list.setPage(1);
  }

  if (!session) return <SkeletonTable />;

  const current = LOG_KINDS.find((k) => k.id === kind)!;
  const items = list.data?.items ?? [];
  const showInstitution = global && !filters.institutionId;
  const active = hasActiveFilters({ ...filters, q: list.search });

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{global ? t('Bitácoras de la plataforma') : t('Bitácoras de la institución')}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {global
          ? t('Registro de todas las instituciones. Filtrá por institución para ver la bitácora de una en particular.')
          : t('Registro de lo que pasó en tu institución: quién hizo cada acción y cuándo.')}
      </div>

      <div className="flex flex-wrap gap-1 mb-1 border-b border-gray-border" role="tablist">
        {LOG_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => switchKind(k.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px cursor-pointer ${
              kind === k.id ? 'border-emerald-600 text-text-pri' : 'border-transparent text-text-sec hover:text-text-pri'
            }`}
          >
            <Icon name={KIND_ICON[k.id]} size={13} />
            {t(k.label)}
            {kind === k.id && list.data && <span className="text-[10.5px] text-text-ter tabular-nums">{list.data.total}</span>}
          </button>
        ))}
      </div>
      <div className="text-[11.5px] text-text-ter mb-3">{t(current.description)}</div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-[2_1_240px]">
          <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
          <input value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder={t(SEARCH_PLACEHOLDER[kind])} aria-label={t('Buscar')} className={`${input} pl-8`} />
        </div>
        <select value={filters.type} onChange={(e) => update({ type: e.target.value })} aria-label={t('Tipo')} className={`${input} flex-[1_1_190px] w-auto`}>
          <option value="">{kind === 'eventos' ? t('Todas las categorías') : kind === 'auditoria' ? t('Todas las operaciones') : t('Todos los orígenes')}</option>
          {LOG_TYPE_OPTIONS[kind].map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
        {global && (
          <select value={filters.institutionId} onChange={(e) => update({ institutionId: e.target.value })} aria-label={t('Institución')} className={`${input} flex-[1_1_220px] w-auto`}>
            <option value="">{t('Todas las instituciones')}</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex flex-[1_1_180px] max-w-[260px] items-center gap-1.5 text-[11px] text-text-sec">
          {t('Desde')}
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} className={input} />
        </label>
        <label className="flex flex-[1_1_180px] max-w-[260px] items-center gap-1.5 text-[11px] text-text-sec">
          {t('Hasta')}
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} className={input} />
        </label>
        <button
          type="button"
          onClick={clearFilters}
          disabled={!active}
          className="inline-flex flex-none items-center justify-center gap-1 text-[11.5px] font-semibold text-text-sec border border-gray-border rounded-[6px] px-3 py-[7px] hover:text-text-pri disabled:opacity-40 cursor-pointer"
        >
          <Icon name="close" size={12} />
          {t('Limpiar')}
        </button>
      </div>


      {list.error && <div className="text-xs text-red mb-2">{list.error}</div>}

      {!list.data ? (
        <SkeletonTable />
      ) : items.length === 0 ? (
        <div className="text-[12.5px] text-text-sec border border-dashed border-gray-border rounded-[8px] px-4 py-8 text-center">
          {active ? t('No hay registros que coincidan con los filtros.') : t('Todavía no hay registros en esta bitácora.')}
        </div>
      ) : (
        <div className={list.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <TableWrap>
            {kind === 'eventos' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>{t('Fecha')}</th>
                    <th className={th}>{t('Tipo')}</th>
                    <th className={th}>{t('Descripción')}</th>
                    <th className={th}>{t('Usuario')}</th>
                    {showInstitution && <th className={th}>{t('Institución')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {(items as EventLogEntry[]).map((e) => (
                    <tr key={e.id} className="text-[12px]">
                      <td className={`${td} whitespace-nowrap tabular-nums text-text-sec`}>{dateOf(e.createdAt)}</td>
                      <td className={td}>
                        <div className="flex flex-col items-start gap-1">
                          <Badge color={ALERT_TYPES.has(e.type) ? 'red' : CATEGORY_COLOR[e.category]}>{t(EVENT_TYPE_LABEL[e.type] ?? e.type)}</Badge>
                          <span className="text-[10.5px] text-text-ter">{t(LOG_TYPE_OPTIONS.eventos.find((o) => o.value === e.category)?.label)}</span>
                        </div>
                      </td>
                      <td className={`${td} text-text-pri`}>{e.description}</td>
                      <td className={`${td} max-w-[220px]`}>
                        <UserCell name={e.userName} email={e.userEmail} role={e.role} impersonated={e.impersonated} />
                      </td>
                      {showInstitution && <td className={`${td} text-text-sec`}>{e.institutionName ?? t('Plataforma')}</td>}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {kind === 'auditoria' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>{t('Fecha')}</th>
                    <th className={th}>{t('Operación')}</th>
                    <th className={th}>{t('Alumno o dato')}</th>
                    <th className={th}>{t('Realizado por')}</th>
                    {showInstitution && <th className={th}>{t('Institución')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {(items as AuditLogEntry[]).map((a) => (
                    <tr key={a.id} className="text-[12px]">
                      <td className={`${td} whitespace-nowrap tabular-nums text-text-sec`}>{dateOf(a.date)}</td>
                      <td className={td}>
                        <Badge color={OPERATION[a.operation]?.color ?? 'gray'}>{t(OPERATION[a.operation]?.label) ?? a.operation}</Badge>
                      </td>
                      <td className={`${td} text-text-pri`}>{a.studentName}</td>
                      <td className={`${td} text-text-sec`}>{a.performedBy}</td>
                      {showInstitution && <td className={`${td} text-text-sec`}>{a.institutionName ?? t('Sin institución')}</td>}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {kind === 'errores' && (
              <>
                <thead>
                  <tr>
                    <th className={th}>{t('Fecha')}</th>
                    <th className={th}>{t('Origen')}</th>
                    <th className={th}>{t('Operación')}</th>
                    <th className={th}>{t('Mensaje')}</th>
                    <th className={th}>{t('Usuario')}</th>
                    {showInstitution && <th className={th}>{t('Institución')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {(items as ErrorLogEntry[]).map((e) => (
                    <tr key={e.id} className="text-[12px]">
                      <td className={`${td} whitespace-nowrap tabular-nums text-text-sec`}>{dateOf(e.createdAt)}</td>
                      <td className={td}>
                        <div className="flex flex-col items-start gap-1">
                          <Badge color="red">{e.status}</Badge>
                          <span className="text-[10.5px] text-text-ter">{e.source === 'API' ? 'API' : t('Proceso')}</span>
                        </div>
                      </td>
                      <td className={`${td} font-mono text-[11px] text-text-sec break-all min-w-[170px]`}>{e.method ? `${e.method} ${e.path ?? ''}` : t('Proceso del servidor')}</td>
                      <td className={`${td} text-text-pri`}>
                        <div className="break-words">{e.message}</div>
                        {e.stack && (
                          <button
                            type="button"
                            onClick={() => setOpenError(openError === e.id ? null : e.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                          >
                            <Icon name="chevronDown" size={11} className={openError === e.id ? 'rotate-180' : ''} />
                            {openError === e.id ? t('Ocultar detalle técnico') : t('Ver detalle técnico')}
                          </button>
                        )}
                        {e.stack && openError === e.id && (
                          <pre className="mt-1.5 max-h-[220px] overflow-auto text-[10.5px] leading-snug bg-gray-bg border border-gray-border rounded-[6px] p-2 whitespace-pre-wrap">{e.stack}</pre>
                        )}
                      </td>
                      <td className={`${td} max-w-[200px]`}>
                        <UserCell name={null} email={e.userEmail} role={e.role} />
                      </td>
                      {showInstitution && <td className={`${td} text-text-sec`}>{e.institutionName ?? t('Sin institución')}</td>}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            pageSize={list.data.pageSize}
            onChange={list.setPage}
            label={t('registros')}
            className="mt-3"
          />
        </div>
      )}
    </div>
  );
}
