import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Skeleton, SkeletonTable } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { ensureAdminSession } from '../../../services/authService';
import { listInstitutions } from '../../../services/institutionService';
import type { Institution } from '../../../types/institution';

import { sessionStore } from '../../../store/sessionStore';

const STATUS_LABEL: Record<Institution['status'], string> = {
  activo: 'Activa',
  piloto_no_confirmado: 'Piloto no confirmado',
};

export function InstitutionsListScreen() {
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [search, setSearch] = useState('');
  // Menú «Ver como» abierto: se abre con clic (también en celulares y con teclado), no sólo pasando el mouse.
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

  useEffect(() => {
    ensureAdminSession()
      .then(() => listInstitutions())
      .then(setInstitutions);
  }, []);

  if (!institutions) {
    return <HabitarLoader size="lg" message="Cargando instituciones educativas..." />;
  }

  const filtered = institutions.filter((inst) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return inst.name.toLowerCase().includes(term) || inst.domain.toLowerCase().includes(term);
  });

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Instituciones</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">{institutions.length} instituciones dadas de alta en la plataforma</div>

      <div className="relative mb-3 max-w-[320px]">
        <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o dominio…"
          className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
        />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Institución</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Dominio</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Coordinador/a</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
            <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((inst) => (
            <tr key={inst.id}>
              <td className="px-2.5 py-2.5 border-b border-gray-border font-medium">{inst.name}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec font-mono text-[11.5px]">{inst.domain}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec">{inst.coordinatorEmail}</td>
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <Badge color={inst.status === 'activo' ? 'green' : 'amber'}>{STATUS_LABEL[inst.status]}</Badge>
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
                      Ver como
                      <Icon name="chevronDown" size={10} />
                    </button>
                    <div
                      role="menu"
                      className={`${openMenuId === inst.id ? 'block' : 'hidden'} absolute right-0 top-full mt-1 z-30 w-48`}
                    >
                      <div className="bg-card-bg border border-gray-border rounded-lg shadow-xl py-1 text-xs">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-text-ter uppercase tracking-wider border-b border-gray-border whitespace-normal">
                          Ingresar a {inst.name}
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'coordinador')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">Coordinador</span>
                          <span className="text-[10px] text-text-ter">Panel</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'director')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">Director</span>
                          <span className="text-[10px] text-text-ter">Auditoría</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => enterAs(inst, 'docente')}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-text-pri flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium">Docente</span>
                          <span className="text-[10px] text-text-ter">Cursos</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/admin/instituciones/oauth?slug=${inst.slug}`}
                    className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-50 dark:hover:bg-white/5 text-text-pri border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="lock" size={10} />
                    Acceso
                  </a>
                  <a
                    href={`/admin/instituciones/usuarios?slug=${inst.slug}`}
                    className="flex items-center gap-1 whitespace-nowrap bg-white hover:bg-gray-50 dark:hover:bg-white/5 text-text-pri border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="school" size={10} />
                    Usuarios
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2.5 py-6 text-center text-text-ter text-[12px]">
                No hay instituciones que coincidan con la búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
