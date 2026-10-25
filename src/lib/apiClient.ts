import { sessionStore } from '../store/sessionStore';
import { getLocale, t } from '../i18n';

const API_URL =
  import.meta.env.PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://api.habitar.lat/api'
    : 'http://localhost:4000/api');

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function languageHeaders(): Record<string, string> {
  return { 'X-Habitar-Language': getLocale() };
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...languageHeaders() };
  const session = sessionStore.get();
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (session?.impersonatedInstitutionId) headers['X-Impersonate-Institution'] = session.impersonatedInstitutionId;
  if (session?.impersonatedRole) headers['X-Impersonate-Role'] = session.impersonatedRole;
  return headers;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...languageHeaders(), ...(auth ? authHeaders() : {}) };

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? t('Error de red inesperado'));
  }

  return data as T;
}
