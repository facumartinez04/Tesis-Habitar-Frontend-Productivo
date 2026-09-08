import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { getInstitutionById, updateInstitutionConfig } from '../../../services/institutionService';
import {
  inviteInstitutionUser,
  listInstitutionUsers,
  setInstitutionUserActive,
  updateInstitutionUserRole,
  type InstitutionUser,
} from '../../../services/institutionUsersService';
import { getRetentionPolicy, purgeExpiredData, updateRetentionPolicy, type RetentionPolicy } from '../../../services/complianceService';
import { confirmDestructive, showError } from '../../../lib/alerts';
import type { ComprehensionAxis, EducationLevel, Institution } from '../../../types/institution';
import type { Role } from '../../../types/auth';

const ROLE_LABEL: Record<Role, string> = { docente: 'Docente', coordinador: 'Coordinador/a', admin: 'Admin' };
const LEVEL_LABEL: Record<EducationLevel, string> = { primario: 'Primario', secundario: 'Secundario' };
const AXIS_LABEL: Record<ComprehensionAxis, string> = { literal: 'Literal', inferencial: 'Inferencial', critico: 'Crítico' };

export function InstitutionSettingsScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const { message, showToast } = useToast();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [retention, setRetention] = useState<RetentionPolicy | null>(null);

  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [axes, setAxes] = useState<ComprehensionAxis[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'docente' as Role });
  const [inviting, setInviting] = useState(false);

  const [retentionMonths, setRetentionMonths] = useState(24);
  const [purging, setPurging] = useState(false);

  async function refresh() {
    if (!session) return;
    const institutionId = session.user.institutionId;
    const [inst, userList, retentionPolicy] = await Promise.all([
      getInstitutionById(institutionId),
      listInstitutionUsers(institutionId),
      getRetentionPolicy(institutionId),
    ]);
    setInstitution(inst);
    setUsers(userList);
    setRetention(retentionPolicy);
    setRetentionMonths(retentionPolicy.retentionMonths);
  }

  useEffect(() => {
    refresh();

  }, [session]);

  useEffect(() => {
    if (institution) {
      setLevels(institution.levels);
      setAxes(institution.enabledAxes);
    }
  }, [institution]);

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSaveConfig() {
    if (!session) return;
    setSavingConfig(true);
    try {
      await updateInstitutionConfig(session.user.institutionId, { levels, enabledAxes: axes });
      showToast('Configuración actualizada');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleInvite() {
    if (!session || !inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviting(true);
    try {
      await inviteInstitutionUser(session.user.institutionId, { ...inviteForm, provider: 'google' });
      setInviteForm({ name: '', email: '', role: 'docente' });
      showToast('Usuario invitado');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo invitar al usuario');
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(user: InstitutionUser) {
    if (!session) return;
    if (user.active) {
      const confirmed = await confirmDestructive({
        title: `¿Desactivar a ${user.name}?`,
        text: 'Va a perder el acceso a Habitar hasta que lo vuelvas a activar.',
        confirmButtonText: 'Sí, desactivar',
      });
      if (!confirmed) return;
    }
    try {
      await setInstitutionUserActive(session.user.institutionId, user.id, !user.active);
      refresh();
    } catch (err) {
      showError('No se pudo actualizar el usuario', err instanceof Error ? err.message : undefined);
    }
  }

  async function handleRoleChange(user: InstitutionUser, role: Role) {
    if (!session) return;
    await updateInstitutionUserRole(session.user.institutionId, user.id, role);
    refresh();
  }

  async function handleSaveRetention() {
    if (!session) return;
    await updateRetentionPolicy(session.user.institutionId, retentionMonths);
    showToast('Política de retención actualizada');
    refresh();
  }

  async function handlePurge() {
    if (!session) return;
    const confirmed = await confirmDestructive({
      title: '¿Purgar datos vencidos?',
      text: `Se van a eliminar de forma permanente los alumnos dados de alta hace más de ${retentionMonths} meses. Esta acción no se puede deshacer.`,
      confirmButtonText: 'Sí, purgar',
    });
    if (!confirmed) return;

    setPurging(true);
    try {
      const result = await purgeExpiredData(session.user.institutionId);
      showToast(`Purga completada: ${result.purgedStudentCount} alumnos eliminados`);
      refresh();
    } finally {
      setPurging(false);
    }
  }

  if (!session) {
    return (
      <div className="space-y-5">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri tracking-tight">Configuración institucional</div>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">CU-05-06 · Niveles y ejes de comprensión habilitados</div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">Niveles</div>
            <div className="flex gap-2">
              {(['primario', 'secundario'] as EducationLevel[]).map((level) => (
                <label key={level} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={levels.includes(level)} onChange={() => toggle(levels, level, setLevels)} />
                  {LEVEL_LABEL[level]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">Ejes de comprensión</div>
            <div className="flex gap-2">
              {(['literal', 'inferencial', 'critico'] as ComprehensionAxis[]).map((axis) => (
                <label key={axis} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={axes.includes(axis)} onChange={() => toggle(axes, axis, setAxes)} />
                  {AXIS_LABEL[axis]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSaveConfig} disabled={savingConfig} className="mt-3 bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          {savingConfig ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">CU-05-05 · Usuarios y roles de la institución</div>

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
          </select>
          <button onClick={handleInvite} disabled={inviting} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {inviting ? 'Invitando…' : 'Invitar'}
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
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">CU-04-04 · Retención y purga de datos</div>
        <div className="text-[11px] text-text-sec mb-3">
          Los datos de alumnos dados de alta hace más del período configurado son elegibles para purga (Ley 25.326).
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <label className="text-[12px] text-text-sec">Retener datos por</label>
          <input
            type="number"
            min={1}
            max={120}
            value={retentionMonths}
            onChange={(e) => setRetentionMonths(Number(e.target.value))}
            className="w-16 border border-gray-border rounded-md px-2 py-1 text-[12px]"
          />
          <span className="text-[12px] text-text-sec">meses</span>
          <button onClick={handleSaveRetention} className="bg-white border border-gray-border rounded-md text-[11.5px] px-2.5 py-1.5">
            Guardar
          </button>
        </div>
        <div className="text-[11px] text-text-ter mb-2.5">
          Última purga: {retention?.lastPurgeAt ? new Date(retention.lastPurgeAt).toLocaleDateString('es-AR') : 'nunca'}
        </div>
        <button onClick={handlePurge} disabled={purging} className="flex items-center gap-1.5 bg-red text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          <Icon name="trash" size={12} />
          {purging ? 'Purgando…' : 'Ejecutar purga ahora'}
        </button>
      </Card>
    </div>
  );
}
