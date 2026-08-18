import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { ensureAdminSession } from '../../../services/authService';
import { listInstitutions } from '../../../services/institutionService';
import type { Institution } from '../../../types/institution';

const STATUS_LABEL: Record<Institution['status'], string> = {
  activo: 'Activa',
  piloto_no_confirmado: 'Piloto no confirmado',
};

export function InstitutionsListScreen() {
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    ensureAdminSession()
      .then(() => listInstitutions())
      .then(setInstitutions);
  }, []);

  if (!institutions) return <div className="text-xs text-text-ter">Cargando…</div>;

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
              <td className="px-2.5 py-2.5 border-b border-gray-border">
                <div className="flex gap-1.5">
                  <a
                    href={`/admin/instituciones/oauth?slug=${inst.slug}`}
                    className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
                  >
                    <Icon name="lock" size={10} />
                    Acceso
                  </a>
                  <a
                    href={`/admin/instituciones/usuarios?slug=${inst.slug}`}
                    className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]"
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
