import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { HabitarLoader } from '../ui/HabitarLoader';
import { showSuccess, showError, confirmDestructive } from '../../../lib/alerts';
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
  'finanzas',
  'monitoreo',
  'jira',
  'roles',
];

interface ModuleMeta {
  name: string;
  description: string;
  category: 'Administración' | 'Académico' | 'Monitoreo' | 'Cumplimiento' | 'Comercial' | 'Técnico' | 'Seguridad';
  icon: 'building' | 'sliders' | 'users' | 'kanban' | 'sparkles' | 'award' | 'chart' | 'bell' | 'shield' | 'creditCard' | 'dollarSign' | 'activity' | 'layers' | 'lock';
}

const MODULE_INFO: Record<PlatformModule, ModuleMeta> = {
  instituciones: {
    name: 'Instituciones & Negocios',
    description: 'Gestión de colegios, organizaciones, dominios y configuración de accesos multi-tenant.',
    category: 'Administración',
    icon: 'building',
  },
  configuracion: {
    name: 'Configuración Institucional',
    description: 'Parámetros pedagógicos, ciclos lectivos, logos y preferencias de la escuela.',
    category: 'Administración',
    icon: 'sliders',
  },
  usuarios: {
    name: 'Usuarios & Personal',
    description: 'Alta, baja y asignación de coordinadores, directores, docentes y preceptores.',
    category: 'Administración',
    icon: 'users',
  },
  cursos: {
    name: 'Cursos & Aulas',
    description: 'Creación de divisiones, materias, asignación de docentes titulares y turnos.',
    category: 'Académico',
    icon: 'kanban',
  },
  actividades: {
    name: 'Actividades de Aprendizaje',
    description: 'Diseño de rúbricas, ejercicios interactivos con IA, formularios y tareas guiadas.',
    category: 'Académico',
    icon: 'sparkles',
  },
  alumnos: {
    name: 'Estudiantes & Perfiles',
    description: 'Matriculación, legajos académicos, asistencia y datos personales de alumnos.',
    category: 'Académico',
    icon: 'award',
  },
  resultados: {
    name: 'Resultados & Métricas',
    description: 'Visualización de calificaciones, progreso de lectura y analítica curricular.',
    category: 'Académico',
    icon: 'chart',
  },
  alertas: {
    name: 'Alertas Tempranas',
    description: 'Detección automática de ausentismo reiterado, desfasaje y bajo rendimiento.',
    category: 'Monitoreo',
    icon: 'bell',
  },
  cumplimiento: {
    name: 'Privacidad & Derechos ARCO',
    description: 'Gestión de solicitudes de acceso, rectificación, cancelación y oposición de datos.',
    category: 'Cumplimiento',
    icon: 'shield',
  },
  suscripciones: {
    name: 'Planes & Suscripciones',
    description: 'Contratos, cuotas, upgrades a plan anual y estados de facturación comercial.',
    category: 'Comercial',
    icon: 'creditCard',
  },
  finanzas: {
    name: 'Finanzas & Mercado Pago',
    description: 'Control de gastos de negocio, cuotas escolares y pasarela de cobro Mercado Pago.',
    category: 'Comercial',
    icon: 'dollarSign',
  },
  monitoreo: {
    name: 'Salud del Sistema & Logs',
    description: 'Telemetría de servicios, tiempos de respuesta, base de datos y auditoría de eventos.',
    category: 'Técnico',
    icon: 'activity',
  },
  jira: {
    name: 'Jira & Tareas de Producto',
    description: 'Issues, roadmap del proyecto, gestión de sprints y reporte de bugs con IA.',
    category: 'Técnico',
    icon: 'layers',
  },
  roles: {
    name: 'Roles & Permisos (RBAC)',
    description: 'Control de acceso basado en roles, matriz granular y asignación de privilegios.',
    category: 'Seguridad',
    icon: 'lock',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Administración: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
  Académico: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
  Monitoreo: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
  Cumplimiento: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
  Comercial: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/40',
  Técnico: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  Seguridad: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
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
  const [loading, setLoading] = useState(true);

  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<RolePermission[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleSearch, setModuleSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTemplate, setNewRoleTemplate] = useState('docente');
  const [isCreating, setIsCreating] = useState(false);

  const loadRoles = async () => {
    try {
      setLoading(true);
      await ensureAdminSession();
      const list = await listRoles();
      setRoles(list);
    } catch (err) {
      console.error('Error cargando roles:', err);
      showError('Error', 'No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setCurrentPermissions(normalizePermissions(role.permissions));
    setHasChanges(false);
    setModuleSearch('');

    const initialExpanded: Record<string, boolean> = {};
    ALL_MODULES.slice(0, 2).forEach((mod) => {
      initialExpanded[mod] = true;
    });
    setExpandedModules(initialExpanded);
  };

  const handleCloseEditor = () => {
    if (hasChanges) {
      if (!confirm('Tenés cambios sin guardar. ¿Deseás cerrar de todos modos?')) return;
    }
    setEditingRole(null);
    setHasChanges(false);
  };

  const toggleModuleAccordion = (mod: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [mod]: !prev[mod],
    }));
  };

  const handleExpandAll = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    ALL_MODULES.forEach((mod) => {
      nextState[mod] = expand;
    });
    setExpandedModules(nextState);
  };

  const handleTogglePerm = (
    module: PlatformModule,
    action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canExport',
    val: boolean
  ) => {
    setCurrentPermissions((prev) =>
      prev.map((item) => {
        if (item.module !== module) return item;

        const shouldEnableRead = val && action !== 'canRead';
        return {
          ...item,
          [action]: val,
          canRead: shouldEnableRead ? true : action === 'canRead' ? val : item.canRead,
        };
      })
    );
    setHasChanges(true);
  };

  const handleToggleModuleAll = (module: PlatformModule, allOn: boolean) => {
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

  const handleSetGlobal = (mode: 'all' | 'read' | 'none') => {
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
    if (!editingRole) return;
    setIsSaving(true);
    try {
      await updateRole(editingRole.id, {
        permissions: currentPermissions,
      });
      showSuccess('Permisos actualizados', `Los permisos de "${editingRole.name}" se guardaron con éxito.`);
      setHasChanges(false);
      setEditingRole(null);
      await loadRoles();
    } catch (err: any) {
      showError('Error al guardar', err.message || 'No se pudieron actualizar los permisos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.isSystem) return;
    const ok = await confirmDestructive({
      title: `¿Eliminar rol "${role.name}"?`,
      text: 'Los usuarios asignados a este rol perderán los permisos específicos configurados.',
      confirmButtonText: 'Sí, eliminar rol',
    });
    if (!ok) return;

    try {
      await deleteRole(role.id);
      showSuccess('Rol eliminado', 'El rol ha sido removido.');
      await loadRoles();
    } catch (err: any) {
      showError('Error al eliminar', err.message || 'No se pudo eliminar el rol.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsCreating(true);
    try {
      const templateRole = roles?.find((r) => r.id === newRoleTemplate);
      const created = await createRole({
        id: newRoleId.trim() || undefined,
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: templateRole ? templateRole.permissions : [],
      });

      showSuccess('Rol creado', `Se creó el rol "${created.name}".`);
      setIsCreateOpen(false);
      setNewRoleName('');
      setNewRoleId('');
      setNewRoleDesc('');
      await loadRoles();

      handleOpenEditRole(created);
    } catch (err: any) {
      showError('Error al crear rol', err.message || 'No se pudo crear el rol.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return ALL_MODULES;
    return ALL_MODULES.filter((mod) => {
      const info = MODULE_INFO[mod];
      return (
        mod.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.description.toLowerCase().includes(q) ||
        info.category.toLowerCase().includes(q)
      );
    });
  }, [moduleSearch]);

  if (loading) {
    return <HabitarLoader size="lg" message="Cargando roles y permisos del sistema..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-pri">
                Roles y Permisos del Sistema
              </h1>
              <p className="text-xs sm:text-sm text-text-sec mt-0.5">
                Control de acceso granular basado en roles (RBAC). Configurá permisos módulo por módulo con switches interactivos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Icon name="plus" size={14} />
          <span>Nuevo Rol Personalizado</span>
        </button>
      </div>

      {}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-text-sec px-1 font-medium">
          <span>Roles Activos ({roles?.length || 0})</span>
          <span>Click en "Editar Permisos" para configurar</span>
        </div>

        {roles && roles.length > 0 ? (
          roles.map((role) => {
            const activePermsCount = role.permissions.filter(
              (p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete || p.canExport
            ).length;
            const isFullAdmin = activePermsCount === ALL_MODULES.length && role.permissions.every(
              (p) => p.canRead && p.canCreate && p.canUpdate && p.canDelete && p.canExport
            );

            return (
              <div
                key={role.id}
                className="bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-[#2D3342] rounded-xl p-5 shadow-xs hover:border-emerald-600/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all duration-150"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-text-pri tracking-tight">
                        {role.name}
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-text-sec border border-gray-200 dark:border-gray-700">
                        slug: {role.id}
                      </span>
                      {role.isSystem ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          Rol de Sistema
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                          Rol Personalizado
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-text-sec line-clamp-2">
                      {role.description || 'Sin descripción asignada.'}
                    </p>

                    {}
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                      {isFullAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/50">
                          <Icon name="check" size={12} />
                          Acceso Total a Todos los Módulos ({ALL_MODULES.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface dark:bg-[#131620] text-text-pri font-medium border border-gray-border dark:border-gray-800">
                          <Icon name="shield" size={12} className="text-emerald-600 dark:text-emerald-400" />
                          {activePermsCount} de {ALL_MODULES.length} módulos con permisos
                        </span>
                      )}

                      {}
                      {role.permissions.some((p) => p.module === 'finanzas' && p.canRead) && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
                          <Icon name="creditCard" size={11} className="inline-block align-[-2px] mr-1" />Finanzas / MP
                        </span>
                      )}
                      {role.permissions.some((p) => p.module === 'actividades' && p.canCreate) && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          <Icon name="sparkles" size={11} className="inline-block align-[-2px] mr-1" />Crear actividades
                        </span>
                      )}
                      {role.permissions.some((p) => p.module === 'cumplimiento' && p.canDelete) && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                          <Icon name="lock" size={11} className="inline-block align-[-2px] mr-1" />Purga ARCO
                        </span>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRole(role)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Icon name="sliders" size={14} />
                      <span>Editar Permisos</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Rol Personalizado"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-[#2D3342] rounded-xl p-12 text-center text-text-sec">
            No se encontraron roles configurados en la plataforma.
          </div>
        )}
      </div>

      {

}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-[#2D3342] rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {}
            <div className="flex items-start justify-between pb-4 border-b border-gray-border dark:border-gray-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-text-pri tracking-tight flex items-center gap-2">
                    <Icon name="sliders" size={18} className="text-emerald-600 dark:text-emerald-400" />
                    Permisos de: {editingRole.name}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-text-sec">
                    {editingRole.id}
                  </span>
                </div>
                <p className="text-xs text-text-sec mt-1">
                  Hacé click en cada módulo para desplegar hacia abajo y activar o desactivar cada permiso con los interruptores.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditor}
                className="p-1.5 rounded-lg text-text-ter hover:text-text-pri hover:bg-surface dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {}
            <div className="py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-border dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Icon name="search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ter" />
                <input
                  type="text"
                  placeholder="Buscar módulo (ej: finanzas, cursos, alumnos)..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-border dark:border-gray-700 rounded-lg text-xs bg-surface dark:bg-[#131620] text-text-pri placeholder-text-ter focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetGlobal('all')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer"
                >
                  <Icon name="check" size={11} className="inline-block align-[-2px] mr-1" />Conceder todo
                </button>
                <button
                  type="button"
                  onClick={() => handleSetGlobal('read')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md border border-blue-200 dark:border-blue-800/40 transition-colors cursor-pointer"
                >
                  <Icon name="eye" size={11} className="inline-block align-[-2px] mr-1" />Sólo lectura
                </button>
                <button
                  type="button"
                  onClick={() => handleSetGlobal('none')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-text-sec hover:text-text-pri rounded-md border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                >
                  <Icon name="close" size={11} className="inline-block align-[-2px] mr-1" />Desactivar todo
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                  type="button"
                  onClick={() => handleExpandAll(true)}
                  className="px-2 py-1 text-[11px] text-text-sec hover:text-text-pri underline cursor-pointer"
                >
                  Expandir todos
                </button>
                <button
                  type="button"
                  onClick={() => handleExpandAll(false)}
                  className="px-2 py-1 text-[11px] text-text-sec hover:text-text-pri underline cursor-pointer"
                >
                  Colapsar
                </button>
              </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {filteredModules.map((mod) => {
                const info = MODULE_INFO[mod];
                const perm = currentPermissions.find((p) => p.module === mod) || {
                  module: mod,
                  canRead: false,
                  canCreate: false,
                  canUpdate: false,
                  canDelete: false,
                  canExport: false,
                };
                const isExpanded = !!expandedModules[mod];

                const activeCount = [
                  perm.canRead,
                  perm.canCreate,
                  perm.canUpdate,
                  perm.canDelete,
                  perm.canExport,
                ].filter(Boolean).length;

                const isAllActive = activeCount === 5;
                const isNoneActive = activeCount === 0;

                return (
                  <div
                    key={mod}
                    className={`border rounded-xl transition-all duration-150 overflow-hidden ${
                      isExpanded
                        ? 'border-emerald-500/60 dark:border-emerald-500/50 shadow-xs'
                        : 'border-gray-border dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    } bg-surface/50 dark:bg-[#151822]`}
                  >
                    {}
                    <div
                      onClick={() => toggleModuleAccordion(mod)}
                      className="p-3.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-gray-100/50 dark:hover:bg-[#1E2230] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-white dark:bg-[#1A1E29] border border-gray-border dark:border-gray-700 text-text-pri shrink-0">
                          <Icon name={info.icon} size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-text-pri">
                              {info.name}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                                CATEGORY_COLORS[info.category] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {info.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-sec truncate max-w-xl">
                            {info.description}
                          </p>
                        </div>
                      </div>

                      {}
                      <div className="flex items-center gap-3 shrink-0">
                        {isAllActive ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            Acceso Total (5/5)
                          </span>
                        ) : isNoneActive ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-text-ter">
                            Sin Acceso
                          </span>
                        ) : perm.canRead && activeCount === 1 ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Solo Lectura
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {activeCount} de 5 activos
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleModuleAll(mod, !isAllActive);
                          }}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold hidden sm:inline"
                        >
                          {isAllActive ? 'Desactivar todo' : 'Activar todo'}
                        </button>

                        <div className={`text-text-ter transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <Icon name="arrowRight" size={14} className="rotate-90" />
                        </div>
                      </div>
                    </div>

                    {}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-border/60 dark:border-gray-800/80 bg-white dark:bg-[#1A1E29] space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {}
                          <div className="p-3 rounded-xl border border-gray-border dark:border-gray-800 bg-surface dark:bg-[#131620] hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                            <ToggleSwitch
                              checked={perm.canRead}
                              onChange={(val) => handleTogglePerm(mod, 'canRead', val)}
                              label="Lectura / Visualización"
                              description="Acceder al módulo y ver información, listados y métricas."
                              id={`switch-${mod}-read`}
                              size="md"
                            />
                          </div>

                          {}
                          <div className="p-3 rounded-xl border border-gray-border dark:border-gray-800 bg-surface dark:bg-[#131620] hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                            <ToggleSwitch
                              checked={perm.canCreate}
                              onChange={(val) => handleTogglePerm(mod, 'canCreate', val)}
                              label="Creación"
                              description="Dar de alta y registrar nuevos elementos o registros."
                              id={`switch-${mod}-create`}
                              size="md"
                            />
                          </div>

                          {}
                          <div className="p-3 rounded-xl border border-gray-border dark:border-gray-800 bg-surface dark:bg-[#131620] hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                            <ToggleSwitch
                              checked={perm.canUpdate}
                              onChange={(val) => handleTogglePerm(mod, 'canUpdate', val)}
                              label="Edición / Modificación"
                              description="Modificar y actualizar campos, estados y configuraciones."
                              id={`switch-${mod}-update`}
                              size="md"
                            />
                          </div>

                          {}
                          <div className="p-3 rounded-xl border border-gray-border dark:border-gray-800 bg-surface dark:bg-[#131620] hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                            <ToggleSwitch
                              checked={perm.canDelete}
                              onChange={(val) => handleTogglePerm(mod, 'canDelete', val)}
                              label="Eliminación"
                              description="Borrar o dar de baja registros de manera destructiva."
                              id={`switch-${mod}-delete`}
                              size="md"
                            />
                          </div>

                          {}
                          <div className="p-3 rounded-xl border border-gray-border dark:border-gray-800 bg-surface dark:bg-[#131620] hover:border-gray-300 dark:hover:border-gray-700 transition-colors md:col-span-2">
                            <ToggleSwitch
                              checked={perm.canExport}
                              onChange={(val) => handleTogglePerm(mod, 'canExport', val)}
                              label="Exportación de Datos"
                              description="Descargar reportes ejecutivos, planillas Excel, CSV o expedientes normativos."
                              id={`switch-${mod}-export`}
                              size="md"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {}
            <div className="pt-4 border-t border-gray-border dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="text-xs text-text-sec">
                {hasChanges ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Tenés cambios sin guardar
                  </span>
                ) : (
                  <span>Permisos sincronizados con el servidor</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="px-4 py-2 border border-gray-border dark:border-gray-700 rounded-lg text-xs font-semibold text-text-sec hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Icon name="refresh" size={13} className="animate-spin" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={13} />
                      <span>Guardar Permisos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {

}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1E29] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-border dark:border-[#2D3342]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
                <Icon name="shield" size={18} className="text-emerald-700 dark:text-emerald-400" />
                Crear Nuevo Rol Personalizado
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-text-ter hover:text-text-pri p-1 rounded-md cursor-pointer"
              >
                <Icon name="close" size={16} />
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
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono bg-surface dark:bg-[#131620] text-text-pri focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Plantilla de Permisos Inicial
                </label>
                <select
                  value={newRoleTemplate}
                  onChange={(e) => setNewRoleTemplate(e.target.value)}
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="docente">Copiar permisos de Docente Titular</option>
                  <option value="coordinador">Copiar permisos de Coordinador Pedagógico</option>
                  <option value="admin">Copiar permisos de Administrador Global</option>
                  <option value="">Iniciar sin ningún permiso (Vacío)</option>
                </select>
                <span className="text-[10.5px] text-text-ter">Luego podrás ajustar cada interruptor de permiso libremente.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-border dark:border-gray-700 rounded-lg text-xs font-semibold text-text-sec hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isCreating ? 'Creando…' : 'Crear Rol y Configurar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
