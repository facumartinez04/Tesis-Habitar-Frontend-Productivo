import { apiFetch } from '../lib/apiClient';
import type { CreateRoleInput, ModuleMetadata, RoleDefinition, UpdateRoleInput } from '../types/role';

export async function listRoles(): Promise<RoleDefinition[]> {
  const data = await apiFetch<{ roles: RoleDefinition[] }>('/roles');
  return data.roles;
}

export async function getRole(id: string): Promise<RoleDefinition> {
  const data = await apiFetch<{ role: RoleDefinition }>(`/roles/${id}`);
  return data.role;
}

export async function createRole(input: CreateRoleInput): Promise<RoleDefinition> {
  const data = await apiFetch<{ role: RoleDefinition }>('/roles', {
    method: 'POST',
    body: input,
  });
  return data.role;
}

export async function updateRole(id: string, input: UpdateRoleInput): Promise<RoleDefinition> {
  const data = await apiFetch<{ role: RoleDefinition }>(`/roles/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return data.role;
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch<void>(`/roles/${id}`, {
    method: 'DELETE',
  });
}

export async function listModules(): Promise<ModuleMetadata[]> {
  const data = await apiFetch<{ modules: ModuleMetadata[] }>('/roles/modules');
  return data.modules;
}
