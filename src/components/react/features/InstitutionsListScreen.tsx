import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { DropdownMenu } from '../ui/DropdownMenu';
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

const BTN =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-mid/40';

export function InstitutionsListScreen() {
  useI18n();
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [search, setSearch] = useState('');

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
        <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Buscar por nombre o dominio…')}
          className="w-full h-9 pl-8 pr-3 border border-gray-border rounded-lg bg-card-bg text-[13px] text-text-pri placeholder:text-text-ter focus:outline-none focus:ring-2 focus:ring-green-mid/30 focus:border-green-mid/50"
        />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-text-ter px-4 py-2.5 border-b border-gray-border bg-white">{t('Institución')}</th>
            <th className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-text-ter px-4 py-2.5 border-b border-gray-border bg-white">Coordinador/a</th>
            <th className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-text-ter px-4 py-2.5 border-b border-gray-border bg-white">{t('Estado')}</th>
            <th className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-text-ter px-4 py-2.5 border-b border-gray-border bg-white text-right">{t('Acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {paged.pageItems.map((inst) => (
            <tr key={inst.id} className="transition-colors hover:bg-surface/70">
              <td className="px-4 py-3 border-b border-gray-border align-middle">
                <div className="font-semibold text-text-pri leading-tight">{inst.name}</div>
                <div className="mt-0.5 font-mono text-[11.5px] text-text-ter">{inst.domain}</div>
              </td>
              <td className="px-4 py-3 border-b border-gray-border align-middle text-text-sec max-w-[220px]">
                <span className="block truncate" title={inst.coordinatorEmail}>{inst.coordinatorEmail}</span>
              </td>
              <td className="px-4 py-3 border-b border-gray-border align-middle">
                {inst.pausedAt ? (
                  <Badge color="red">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {t('Pausada')}
                  </Badge>
                ) : (
                  <Badge color={inst.status === 'activo' ? 'green' : 'amber'}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {t(STATUS_LABEL[inst.status])}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 border-b border-gray-border align-middle whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
                  <DropdownMenu
                    title={t('Ingresar a {name}', { name: inst.name })}
                    triggerClassName={`${BTN} border-green-mid/40 bg-green-light text-green-dark hover:bg-green-mid/15 dark:text-green-text`}
                    trigger={
                      <>
                        <Icon name="eye" size={14} />
                        {t('Ver como')}
                        <Icon name="chevronDown" size={13} className="opacity-70" />
                      </>
                    }
                    items={[
                      { label: t('Coordinador'), hint: t('Panel'), onSelect: () => enterAs(inst, 'coordinador') },
                      { label: t('Director'), hint: t('Auditoría'), onSelect: () => enterAs(inst, 'director') },
                      { label: t('Docente'), hint: t('Cursos'), onSelect: () => enterAs(inst, 'docente') },
                    ]}
                  />
                  <DropdownMenu
                    title={inst.name}
                    width={220}
                    triggerClassName={`${BTN} border-gray-border bg-card-bg text-text-pri hover:bg-surface`}
                    trigger={
                      <>
                        <Icon name="sliders" size={14} className="text-text-ter" />
                        {t('Gestionar')}
                        <Icon name="chevronDown" size={13} className="opacity-70" />
                      </>
                    }
                    items={[
                      { label: t('Acceso'), hint: 'OAuth', icon: 'lock', href: `/admin/instituciones/oauth?slug=${inst.slug}` },
                      { label: t('Usuarios'), icon: 'users', href: `/admin/instituciones/usuarios?slug=${inst.slug}` },
                      { label: t('Datos'), icon: 'database', href: `/admin/instituciones/datos?slug=${inst.slug}` },
                      inst.pausedAt
                        ? { label: t('Reactivar'), icon: 'refresh', onSelect: () => void togglePause(inst) }
                        : { label: t('Pausar'), icon: 'lock', danger: true, onSelect: () => void togglePause(inst) },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-text-ter text-[13px]">
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
