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

const REFRESH_MARGIN_MS = 60_000;
let refreshing: Promise<string | null> | null = null;

function tokenExpiresSoon(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 - Date.now() < REFRESH_MARGIN_MS;
  } catch {
    return false;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: languageHeaders(),
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) sessionStore.set(null);
          return null;
        }
        const { token } = (await response.json()) as { token: string };
        const current = sessionStore.get();
        if (current) sessionStore.set({ ...current, token });
        return token;
      } catch {
        return null;
      } finally {
        setTimeout(() => {
          refreshing = null;
        }, 0);
      }
    })();
  }
  return refreshing;
}

export async function freshToken(): Promise<string | null> {
  const token = sessionStore.get()?.token;
  if (!token) return null;
  if (!tokenExpiresSoon(token)) return token;
  return (await refreshAccessToken()) ?? sessionStore.get()?.token ?? null;
}

export async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!sessionStore.get()?.token) {
    return fetch(url, { ...init, headers: { ...languageHeaders(), ...(init.headers as Record<string, string>) } });
  }
  await freshToken();
  const send = () => fetch(url, { ...init, headers: { ...authHeaders(), ...(init.headers as Record<string, string>) } });
  const response = await send();
  if (response.status !== 401 || !sessionStore.get()?.token) return response;
  return (await refreshAccessToken()) ? send() : response;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...languageHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const response = auth ? await authorizedFetch(`${API_URL}${path}`, init) : await fetch(`${API_URL}${path}`, init);

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? t('Error de red inesperado'));
  }

  return data as T;
}
