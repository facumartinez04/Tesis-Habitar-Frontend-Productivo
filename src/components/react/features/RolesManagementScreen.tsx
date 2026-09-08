import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Skeleton, SkeletonTable } from '../ui/Skeleton';
import { ensureAdminSession } from '../../../services/authService';
import { createRole, deleteRole, listRoles, updateRole } from '../../../services/roleService';
import type { PlatformModule, RoleDefinition, RolePermission } from '../../../types/role';

const ALL_MODULES: PlatformModule[] = [
  'instituciones',
  'configuracion',
  'usuarios',
  'cursos',
  'actividades',
  'alumnos',
  'resultados',
  'alertas',
  'cumplimiento',
  'suscripciones',
  'monitoreo',
  'jira',
  'roles',
];

const MODULE_INFO: Record<PlatformModule, { name: string; description: string; category: string }> = {
  instituciones: {
    name: 'Instituciones & Negocios',
    description: 'Gestión de colegios, organizaciones, dominios y configuración de accesos.',
    category: 'Administración',
  },
  configuracion: {
    name: 'Configuración Institucional',
    description: 'Parámetros pedagógicos, ciclos lectivos, logos y preferencias de la escuela.',
    category: 'Administración',
  },
  usuarios: {
    name: 'Usuarios & Personal',
    description: 'Alta, baja y asignación de coordinadores, directores, docentes y preceptores.',
    category: 'Administración',
  },
  cursos: {
    name: 'Cursos & Aulas',
    description: 'Creación de divisiones, materias, asignación de docentes titulares y turnos.',
    category: 'Académico',
  },
  actividades: {
    name: 'Actividades de Aprendizaje',
    description: 'Diseño de rúbricas, ejercicios interactivos, formularios y tareas guiadas.',
    category: 'Académico',
  },
  alumnos: {
    name: 'Estudiantes & Perfiles',
    description: 'Matriculación, legajos académicos, asistencia y datos personales de alumnos.',
    category: 'Académico',
  },
  resultados: {
    name: 'Resultados & Métricas',
    description: 'Visualización de calificaciones, progreso de aprendizaje y analítica curricular.',
    category: 'Académico',
  },
  alertas: {
    name: 'Alertas Tempranas',
    description: 'Detección automática de ausentismo reiterado, desfasaje y bajo rendimiento.',
    category: 'Monitoreo',
  },
  cumplimiento: {
    name: 'Privacidad & ARCO',
    description: 'Gestión de solicitudes de derechos de acceso, rectificación, cancelación y oposición.',
    category: 'Cumplimiento',
  },
  suscripciones: {
    name: 'Planes & Renovaciones',
    description: 'Contratos, cuotas, upgrades a plan anual y estados de facturación.',
    category: 'Comercial',
  },
  monitoreo: {
    name: 'Salud del Sistema & Logs',
    description: 'Telemetría de servicios, tiempos de respuesta, base de datos y auditoría de eventos.',
    category: 'Técnico',
  },
  jira: {
    name: 'Jira & Backlog de Producto',
    description: 'Issues, roadmap del proyecto, gestión de sprints y reporte de bugs.',
    category: 'Técnico',
  },
  roles: {
    name: 'Roles & Permisos',
    description: 'Control de acceso basado en roles (RBAC) y matriz granular de seguridad.',
    category: 'Seguridad',
  },
};

function normalizePermissions(existing: RolePermission[] = []): RolePermission[] {
  const map = new Map<PlatformModule, RolePermission>();
  existing.forEach((p) => map.set(p.module, p));

  return ALL_MODULES.map((mod) => {
    return (
      map.get(mod) || {
        module: mod,
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canExport: false,
      }
    );
  });
}

export function RolesManagementScreen() {
  const [roles, setRoles] = useState<RoleDefinition[] | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [currentPermissions, setCurrentPermissions] = useState<RolePermission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Modal para crear rol
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTemplate, setNewRoleTemplate] = useState('docente');
  const [isCreating, setIsCreating] = useState(false);

  // Cargar datos
  const loadRoles = async () => {
    try {
      await ensureAdminSession();
      const list = await listRoles();
      setRoles(list);
      if (list.length > 0 && !selectedRoleId) {
        setSelectedRoleId(list[0].id);
        setCurrentPermissions(normalizePermissions(list[0].permissions));
      } else if (selectedRoleId) {
        const found = list.find((r) => r.id === selectedRoleId);
        if (found) {
          setCurrentPermissions(normalizePermissions(found.permissions));
        }
      }
    } catch (err) {
      console.error('Error cargando roles:', err);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);

  const handleSelectRole = (role: RoleDefinition) => {
    if (hasChanges) {
      const confirmLeave = window.confirm('Tenés cambios sin guardar en este rol. ¿Deseás descartarlos y cambiar de rol?');
      if (!confirmLeave) return;
    }
    setSelectedRoleId(role.id);
    setCurrentPermissions(normalizePermissions(role.permissions));
    setHasChanges(false);
    setSaveMessage(null);
  };

  const handleTogglePerm = (
    module: PlatformModule,
    action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canExport'
  ) => {
    setCurrentPermissions((prev) =>
      prev.map((item) => {
        if (item.module !== module) return item;
        const nextVal = !item[action];
        // Si activamos create/update/delete/export, activamos lectura automáticamente
        const shouldEnableRead = nextVal && action !== 'canRead';
        return {
          ...item,
          [action]: nextVal,
          canRead: shouldEnableRead ? true : item.canRead,
        };
      })
    );
    setHasChanges(true);
  };

  const handleToggleRow = (module: PlatformModule, allOn: boolean) => {
    setCurrentPermissions((prev) =>
      prev.map((item) => {
        if (item.module !== module) return item;
        return {
          module,
          canRead: allOn,
          canCreate: allOn,
          canUpdate: allOn,
          canDelete: allOn,
          canExport: allOn,
        };
      })
    );
    setHasChanges(true);
  };

  const handleSetAll = (mode: 'all' | 'read' | 'none') => {
    setCurrentPermissions((prev) =>
      prev.map((item) => ({
        module: item.module,
        canRead: mode === 'all' || mode === 'read',
        canCreate: mode === 'all',
        canUpdate: mode === 'all',
        canDelete: mode === 'all',
        canExport: mode === 'all',
      }))
    );
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateRole(selectedRole.id, {
        permissions: currentPermissions,
      });
      setSaveMessage({ type: 'success', text: '¡Permisos actualizados con éxito!' });
      setHasChanges(false);
      await loadRoles();
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Error al guardar los permisos' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    const ok = window.confirm(`¿Estás seguro de que deseás eliminar el rol "${selectedRole.name}"?`);
    if (!ok) return;

    try {
      await deleteRole(selectedRole.id);
      setSelectedRoleId('');
      await loadRoles();
    } catch (err: any) {
      alert('Error eliminando rol: ' + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsCreating(true);
    try {
      const templateRole = roles?.find((r) => r.id === newRoleTemplate);
      const initialPermissions = templateRole ? templateRole.permissions : [];

      const created = await createRole({
        id: newRoleId.trim() ? newRoleId.trim().toLowerCase().replace(/\s+/g, '_') : undefined,
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permissions: initialPermissions,
      });

      setIsCreateOpen(false);
      setNewRoleName('');
      setNewRoleId('');
      setNewRoleDesc('');
      await loadRoles();
      setSelectedRoleId(created.id);
      setCurrentPermissions(normalizePermissions(created.permissions));
      setSaveMessage({ type: 'success', text: `Rol "${created.name}" creado exitosamente.` });
    } catch (err: any) {
      alert('Error creando rol: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!roles) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <div className="md:col-span-3 space-y-4">
            <Skeleton className="h-14 rounded-xl" />
            <SkeletonTable rows={10} cols={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-lg font-semibold text-text-pri tracking-tight flex items-center gap-2">
            <Icon name="shield" size={18} className="text-emerald-700" />
            Roles y Permisos del Sistema
          </div>
          <div className="text-[12.5px] text-text-sec mt-0.5">
            Configuración de control de accesos basada en roles (RBAC). Definí qué módulos puede ver, crear, editar o exportar cada rol.
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Icon name="plus" size={13} />
          Nuevo Rol Personalizado
        </button>
      </div>

      {saveMessage && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between border ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{saveMessage.text}</span>
          <button onClick={() => setSaveMessage(null)} className="text-xs font-bold opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Roles List (Left) + Permissions Matrix (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Roles Sidebar */}
        <div className="md:col-span-4 bg-white border border-gray-border rounded-xl shadow-2xs overflow-hidden">
          <div className="px-3.5 py-3 border-b border-gray-border bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-pri">Roles Configurados</span>
            <span className="text-[10.5px] text-text-ter font-mono">{roles.length} roles</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[680px] overflow-y-auto">
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left p-3 transition-colors flex flex-col gap-1 ${
                    isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-pri flex items-center gap-1.5">
                      {role.name}
                      {role.isSystem ? (
                        <Badge color="gray">Sistema</Badge>
                      ) : (
                        <Badge color="blue">Personalizado</Badge>
                      )}
                    </span>
                    <span className="text-[10px] text-text-ter font-mono">{role.id}</span>
                  </div>
                  <p className="text-[11px] text-text-sec line-clamp-2 leading-relaxed">
                    {role.description || 'Sin descripción detallada.'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="md:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="bg-white border border-gray-border rounded-xl shadow-2xs p-5 space-y-4">
              {/* Role Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-pri">{selectedRole.name}</h2>
                    <span className="text-xs font-mono text-text-ter bg-gray-100 px-2 py-0.5 rounded">
                      slug: {selectedRole.id}
                    </span>
                    {selectedRole.isSystem ? (
                      <Badge color="gray">Rol de Sistema</Badge>
                    ) : (
                      <Badge color="blue">Rol Creado</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-sec mt-1">{selectedRole.description}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {!selectedRole.isSystem && (
                    <button
                      onClick={handleDeleteRole}
                      className="px-2.5 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 text-xs rounded-lg font-medium transition-colors"
                    >
                      Eliminar Rol
                    </button>
                  )}
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving || !hasChanges}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    {isSaving ? 'Guardando…' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>

              {/* Bulk Quick Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 p-2.5 rounded-lg border border-gray-border/60 text-xs">
                <span className="text-text-sec font-medium text-[11.5px]">
                  Acciones Rápidas para todos los módulos:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetAll('all')}
                    className="px-2 py-1 bg-white border border-gray-border hover:bg-gray-100 rounded text-[11px] font-medium text-text-pri"
                  >
                    ✓ Conceder Todo
                  </button>
                  <button
                    onClick={() => handleSetAll('read')}
                    className="px-2 py-1 bg-white border border-gray-border hover:bg-gray-100 rounded text-[11px] font-medium text-text-pri"
                  >
                    👁 Solo Lectura
                  </button>
                  <button
                    onClick={() => handleSetAll('none')}
                    className="px-2 py-1 bg-white border border-gray-border hover:bg-gray-100 rounded text-[11px] font-medium text-text-pri"
                  >
                    ✕ Limpiar Todo
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              <TableWrap>
                <thead>
                  <tr>
                    <th className="text-left text-[11px] text-text-sec font-medium px-3 py-2 border-b border-gray-border bg-white w-2/5">
                      Módulo de la Plataforma
                    </th>
                    <th className="text-center text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Lectura
                    </th>
                    <th className="text-center text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Creación
                    </th>
                    <th className="text-center text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Edición
                    </th>
                    <th className="text-center text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Eliminación
                    </th>
                    <th className="text-center text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Exportación
                    </th>
                    <th className="text-right text-[11px] text-text-sec font-medium px-2 py-2 border-b border-gray-border bg-white">
                      Fila
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPermissions.map((perm) => {
                    const info = MODULE_INFO[perm.module] || {
                      name: perm.module,
                      description: '',
                      category: 'General',
                    };
                    const isAllActive =
                      perm.canRead && perm.canCreate && perm.canUpdate && perm.canDelete && perm.canExport;

                    return (
                      <tr key={perm.module} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 border-b border-gray-border">
                          <div className="font-semibold text-text-pri text-xs">{info.name}</div>
                          <div className="text-[11px] text-text-ter leading-tight">{info.description}</div>
                        </td>

                        {/* Read */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-center">
                          <input
                            type="checkbox"
                            checked={perm.canRead}
                            onChange={() => handleTogglePerm(perm.module, 'canRead')}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Create */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-center">
                          <input
                            type="checkbox"
                            checked={perm.canCreate}
                            onChange={() => handleTogglePerm(perm.module, 'canCreate')}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Update */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-center">
                          <input
                            type="checkbox"
                            checked={perm.canUpdate}
                            onChange={() => handleTogglePerm(perm.module, 'canUpdate')}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Delete */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-center">
                          <input
                            type="checkbox"
                            checked={perm.canDelete}
                            onChange={() => handleTogglePerm(perm.module, 'canDelete')}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                          />
                        </td>

                        {/* Export */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-center">
                          <input
                            type="checkbox"
                            checked={perm.canExport}
                            onChange={() => handleTogglePerm(perm.module, 'canExport')}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Row Quick Toggle */}
                        <td className="px-2 py-2.5 border-b border-gray-border text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(perm.module, !isAllActive)}
                            className="text-[10px] text-text-ter hover:text-emerald-700 font-medium underline"
                          >
                            {isAllActive ? 'Desmarcar' : 'Todos'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>

              {/* Bottom Sticky Action Bar if changes are pending */}
              {hasChanges && (
                <div className="sticky bottom-4 bg-emerald-900 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Hay modificaciones sin guardar en los permisos de este rol.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const original = roles.find((r) => r.id === selectedRoleId);
                        if (original) setCurrentPermissions(normalizePermissions(original.permissions));
                        setHasChanges(false);
                      }}
                      className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-xs rounded-lg transition-colors"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={isSaving}
                      className="px-4 py-1 bg-white text-emerald-950 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {isSaving ? 'Guardando…' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-border rounded-xl p-8 text-center text-text-ter text-xs">
              Seleccioná un rol de la lista para ver o editar sus permisos.
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Rol */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-border">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
                <Icon name="shield" size={18} className="text-emerald-700" />
                Crear Nuevo Rol
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-text-ter hover:text-text-pri p-1 rounded-md">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Nombre del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="ej. Preceptor, Tutor de Acompañamiento, Auditor Contable"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!newRoleId) {
                      setNewRoleId(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]/g, '_')
                      );
                    }
                  }}
                  className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Identificador Único (slug)
                </label>
                <input
                  type="text"
                  placeholder="ej. preceptor_academico"
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs font-mono bg-surface text-text-pri focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10.5px] text-text-ter">Se generará automáticamente si lo dejás vacío.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Responsabilidades y alcance de este rol dentro de la institución..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Plantilla Base de Permisos
                </label>
                <select
                  value={newRoleTemplate}
                  onChange={(e) => setNewRoleTemplate(e.target.value)}
                  className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="docente">Copiar permisos de Docente (Cursos y Alumnos)</option>
                  <option value="coordinador">Copiar permisos de Coordinador (Administrativo)</option>
                  <option value="director">Copiar permisos de Director (Supervisión institucional)</option>
                  <option value="auditor">Copiar permisos de Auditor (Solo Lectura)</option>
                  <option value="">Sin permisos iniciales (en blanco)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-border text-xs rounded-lg text-text-sec hover:bg-gray-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newRoleName.trim()}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isCreating ? 'Creando…' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
