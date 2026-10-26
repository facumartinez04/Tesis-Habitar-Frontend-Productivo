import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Pagination } from '../ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { Skeleton, SkeletonTable } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { ensureAdminSession } from '../../../services/authService';
import { listInstitutions } from '../../../services/institutionService';
import type { Institution } from '../../../types/institution';

import { sessionStore } from '../../../store/sessionStore';
import { t, useI18n } from '../../../i18n';
import { pauseInstitution, resumeInstitution } from '../../../services/institutionService';
import { confirmAction, promptText, showError, showSuccess } from '../../../lib/alerts';

const STATUS_LABEL: Record<Institution['status'], string> = {
  activo: 'Activa',
  piloto_no_confirmado: 'Piloto no confirmado',
};

export function InstitutionsListScreen() {
  useI18n();
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('[data-view-as-menu]')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [openMenuId]);

  const enterAs = (inst: Institution, role: 'coordinador' | 'director' | 'docente') => {
    const current = sessionStore.get();
    if (!current) return;
    sessionStore.set({
      ...current,
      impersonatedInstitutionId: inst.id,
      impersonatedInstitutionName: inst.name,
      impersonatedRole: role,
    });
    if (role === 'docente') {
      window.location.href = '/docente/cursos';
    } else {
      window.location.href = '/institucional';
    }
  };

  async function togglePause(inst: Institution) {
    try {
      if (inst.pausedAt) {
        const ok = await confirmAction({
          title: t('¿Reactivar la cuenta de {name}?', { name: inst.name }),
          text: t('Sus usuarios y alumnos vuelven a usar Habitar normalmente.'),
          confirmButtonText: t('Reactivar'),
        });
        if (!ok) return;
        await resumeInstitution(inst.id);
        void showSuccess(t('Cuenta reactivada'));
      } else {
        const reason = await promptText({
          title: t('¿Pausar la cuenta de {name}?', { name: inst.name }),
          text: t('Sus usuarios van a ver un aviso de cuenta pausada y no van a poder usar los paneles ni las actividades. Podés dejar un motivo que verán en el aviso.'),
          placeholder: t('Motivo (opcional), por ejemplo: pago pendiente'),
          confirmButtonText: t('Pausar cuenta'),
        });
        if (reason === null) return;
        await pauseInstitution(inst.id, reason.trim() || null);
        void showSuccess(t('Cuenta pausada'));
      }
      setInstitutions(await listInstitutions());
    } catch (err) {
      void showError(t('No se pudo cambiar el estado de la cuenta'), err instanceof Error ? err.message : undefined);
    }
  }

  const term = search.trim().toLowerCase();
  const filtered = (institutions ?? []).filter(
    (inst) => !term || inst.name.toLowerCase().includes(term) || inst.domain.toLowerCase().includes(term),
  );
  const paged = usePagination(filtered, 15, term);

  useEffect(() => {
    ensureAdminSession()
      .then(() => listInstitutions())
      .then(setInstitutions);
  }, []);

  if (!institutions) {
    return <HabitarLoader size="lg" message={t('Cargando instituciones educativas...')} />;
  }

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{t('Instituciones')}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">{t('{institutionsCount} instituciones dadas de alta en la plataforma', { institutionsCount: institutions.length })}</div>

      <div className="relative mb-3 max-w-[320px]">
        <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Buscar por nombre o dominio…')}
          className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
        />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Institución')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Dominio')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Coordinador/a</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Estado')}</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {paged.pageItems.map((inst) => (
            <tr key={inst.id}>
              <td className="px-2.5 py-2.5 border-b border-gray-border font-medium">{inst.name}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec font-mono text-[11.5px]">{inst.domain}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec">{inst.coordinatorEmail}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                {inst.pausedAt ? (
                  <Badge color="red">{t('Pausada')}</Badge>
                ) : (
                  <Badge color={inst.status === 'activo' ? 'green' : 'amber'}>{t(STATUS_LABEL[inst.status])}</Badge>
                )}
              </td>
              <td className="px-2.5 py-2.5 border-b border-gray-border whitespace-nowrap">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <div className="relative" data-view-as-menu>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === inst.id}
                      onClick={() => setOpenMenuId((id) => (id === inst.id ? null : inst.id))}
                      className="flex items-center gap-1 whitespace-nowrap bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 rounded-[6px] px-2 py-1 text-[10.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      <Icon name="eye" size={11} />
                      {t('Ver como')}
                      <Icon name="chevronDown" size={10} />
                    </button>
                    <div
                      role="menu"
                      className={`${openMenuId === inst.id ? 'block' : 'hidden'} absolute right-0 top-full mt-1 z-30 w-48`}
                    >
                      <div className="bg-card-bg border border-gray-border rounded-lg shadow-xl py-1 text-xs">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-text-ter uppercase tracking-wider border-b border-gray-border whitespace-normal">
                          {t('Ingresar a {name}', { name: inst.name })}
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'coordinador')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">{t('Coordinador')}</span>
                          <span className="text-[10px] text-text-ter">{t('Panel')}</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'director')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">{t('Director')}</span>
                          <span className="text-[10px] text-text-ter">{t('Auditoría')}</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'docente')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">{t('Docente')}</span>
                          <span className="text-[10px] text-text-ter">{t('Cursos')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void togglePause(inst)}
                    className={`flex items-center gap-1 whitespace-nowrap border rounded-[6px] px-2 py-1 text-[10.5px] font-semibold cursor-pointer ${
                      inst.pausedAt
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/40'
                        : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/40'
                    }`}
                  >
                    <Icon name={inst.pausedAt ? 'refresh' : 'lock'} size={10} />
                    {inst.pausedAt ? t('Reactivar') : t('Pausar')}
                  </button>
                  <a
                    href={`/admin/instituciones/oauth?slug=${inst.slug}`}
                    className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-50 dark:hover:bg-white/5 text-text-pri border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="lock" size={10} />
                    {t('Acceso')}
                  </a>
                  <a
                    href={`/admin/instituciones/usuarios?slug=${inst.slug}`}
                    className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-50 dark:hover:bg-white/5 text-text-pri border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="school" size={10} />
                    {t('Usuarios')}
                  </a>
                  <a
                    href={`/admin/instituciones/datos?slug=${inst.slug}`}
                    className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-50 dark:hover:bg-white/5 text-text-pri border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="layers" size={10} />
                    {t('Datos')}
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2.5 py-6 text-center text-text-ter text-[12px]">
                {t('No hay instituciones que coincidan con la búsqueda.')}
              </td>
            </tr>
          )}
        </tbody>
      </TableWrap>
      <Pagination {...paged} onChange={paged.setPage} label={t('instituciones')} />
    </div>
  );
}
