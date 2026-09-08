export type PlatformModule =
  | 'instituciones'
  | 'configuracion'
  | 'usuarios'
  | 'cursos'
  | 'actividades'
  | 'alumnos'
  | 'resultados'
  | 'alertas'
  | 'cumplimiento'
  | 'suscripciones'
  | 'monitoreo'
  | 'jira'
  | 'roles';

export interface ModuleMetadata {
  id: PlatformModule;
  name: string;
  description: string;
}

export interface RolePermission {
  module: PlatformModule;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  id?: string;
  name: string;
  description?: string;
  permissions?: RolePermission[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: RolePermission[];
}
