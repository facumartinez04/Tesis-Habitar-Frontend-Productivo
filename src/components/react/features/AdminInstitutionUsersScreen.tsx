import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard, SkeletonTable } from '../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { ensureAdminSession } from '../../../services/authService';
import { getInstitutionBySlug } from '../../../services/institutionService';
import {
  inviteInstitutionUser,
  listInstitutionUsers,
  setInstitutionUserActive,
  updateInstitutionUserRole,
  type InstitutionUser,
} from '../../../services/institutionUsersService';
import { confirmDestructive, showError } from '../../../lib/alerts';
import type { Institution } from '../../../types/institution';
import type { Role } from '../../../types/auth';

const ROLE_LABEL: Record<Role, string> = { docente: 'Docente', coordinador: 'Coordinador/a',
  director: 'Director/a', admin: 'Admin' };

export function AdminInstitutionUsersScreen() {
  const institutionSlug = useQueryParam('slug', '');
  const { message, showToast } = useToast();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'docente' as Role });
  const [inviting, setInviting] = useState(false);

  async function refresh(institutionId: string) {
    const userList = await listInstitutionUsers(institutionId);
    setUsers(userList);
  }

  useEffect(() => {
    if (!institutionSlug) return;
    setNotFound(false);
    ensureAdminSession()
      .then(() => getInstitutionBySlug(institutionSlug))
      .then((found) => {
        setInstitution(found);
        return refresh(found.id);
      })
      .catch(() => setNotFound(true));
  }, [institutionSlug]);

  async function handleInvite() {
    if (!institution || !inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviting(true);
    try {
      await inviteInstitutionUser(institution.id, { ...inviteForm, provider: 'google' });
      setInviteForm({ name: '', email: '', role: 'docente' });
      showToast('Usuario dado de alta');
      await refresh(institution.id);
    } catch (err) {
      await showError('No se pudo dar de alta al usuario', err instanceof Error ? err.message : undefined);
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(user: InstitutionUser) {
    if (!institution) return;
    if (user.active) {
      const confirmed = await confirmDestructive({
        title: `¿Desactivar a ${user.name}?`,
        text: 'Va a perder el acceso a Habitar hasta que lo vuelvas a activar.',
        confirmButtonText: 'Sí, desactivar',
      });
      if (!confirmed) return;
    }
    try {
      await setInstitutionUserActive(institution.id, user.id, !user.active);
      await refresh(institution.id);
    } catch (err) {
      await showError('No se pudo actualizar el usuario', err instanceof Error ? err.message : undefined);
    }
  }

  async function handleRoleChange(user: InstitutionUser, role: Role) {
    if (!institution) return;
    await updateInstitutionUserRole(institution.id, user.id, role);
    await refresh(institution.id);
  }

  if (!institutionSlug) {
    return <div className="text-xs text-text-ter">Elegí una institución desde el listado.</div>;
  }
  if (notFound) {
    return <div className="text-xs text-red-800">No se encontró la institución "{institutionSlug}".</div>;
  }
  if (!institution) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <SkeletonCard />
        <SkeletonTable rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Usuarios — {institution.name}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">{users.length} usuarios en esta institución</div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-3.5">
          <input
            placeholder="Nombre"
            value={inviteForm.name}
            onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[140px]"
          />
          <input
            placeholder="Email institucional"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[180px]"
          />
          <select
            value={inviteForm.role}
            onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
            className="form-select border border-gray-border rounded-md px-2.5 py-1.5 text-[12px]"
          >
            <option value="docente">{ROLE_LABEL.docente}</option>
            <option value="coordinador">{ROLE_LABEL.coordinador}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </select>
          <button onClick={handleInvite} disabled={inviting} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {inviting ? 'Guardando…' : 'Dar de alta'}
          </button>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Nombre</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Email</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Rol</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-2.5 py-2.5 border-b border-gray-border">{user.name}</td>
                <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec">{user.email}</td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                    className="form-select border border-gray-border rounded-md px-2 py-1 text-[11.5px]"
                  >
                    <option value="docente">{ROLE_LABEL.docente}</option>
                    <option value="coordinador">{ROLE_LABEL.coordinador}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
                  </select>
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <Badge color={user.active ? 'green' : 'gray'}>{user.active ? 'Activo' : 'Desactivado'}</Badge>
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <button onClick={() => handleToggleActive(user)} className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]">
                    <Icon name={user.active ? 'lock' : 'check'} size={10} />
                    {user.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2.5 py-6 text-center text-text-ter text-[12px]">
                  Todavía no hay usuarios en esta institución.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
