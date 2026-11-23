import type { InstitutionPause, OAuthProviderId, Role, Session, User } from '../types/auth';
import { toLower, toUpper } from '../lib/caseAdapters';
import { sessionStore } from '../store/sessionStore';
import { isLocale, setChosenLocale, setContextLocale, t, type Locale } from '../i18n';
import { apiFetch, authorizedFetch, languageHeaders } from '../lib/apiClient';

const API_URL =
  import.meta.env.PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://api.habitar.lat/api'
    : 'http://localhost:4000/api');

interface BackendUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  provider: string;
  institutionId: string;
  language?: string | null;
}

interface MeResponse {
  user: BackendUser;
  institutionLanguage?: string;
  readingMaxChars?: number;
  institutionPaused?: InstitutionPause | null;
}

function applySessionLocale(user: User, institutionLanguage: Locale | undefined): void {
  setContextLocale(institutionLanguage);
  if (user.language) setChosenLocale(user.language);
}

function toUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.name,
    initials: backendUser.initials,
    email: backendUser.email,
    role: toLower<Role>(backendUser.role),
    institutionId: backendUser.institutionId,
    language: isLocale(backendUser.language) ? backendUser.language : null,
  };
}

export function oauthLoginUrl(provider: OAuthProviderId): string {
  return `${API_URL}/auth/${toUpper(provider)}`;
}

/** Ingreso pendiente: la persona se identificó con Google o Microsoft pero su cuenta todavía no puede entrar. */
export interface PendingLogin {
  email: string;
  name: string | null;
  provider: OAuthProviderId;
}

export type RetryPendingResult = { ok: true; dashboardPath: string } | { ok: false; code: string; message: string };

export async function getPendingLogin(): Promise<PendingLogin | null> {
  try {
    const response = await fetch(`${API_URL}/auth/pending`, { credentials: 'include', headers: languageHeaders() });
    if (response.status !== 200) return null;
    const body = (await response.json()) as { email: string; name: string | null; provider: string };
    return { email: body.email, name: body.name, provider: toLower<OAuthProviderId>(body.provider) };
  } catch {
    return null;
  }
}

export async function retryPendingLogin(): Promise<RetryPendingResult> {
  try {
    const response = await fetch(`${API_URL}/auth/pending/retry`, { method: 'POST', credentials: 'include', headers: languageHeaders() });
    const body = (await response.json().catch(() => ({}))) as { token?: string; dashboardPath?: string; code?: string; error?: string };
    if (response.ok && body.token) {
      await completeOAuthCallback(body.token);
      return { ok: true, dashboardPath: body.dashboardPath || '/' };
    }
    return {
      ok: false,
      code: body.code ?? (response.status === 401 ? 'session_expired' : 'auth_failed'),
      message: body.error ?? t('No se pudo iniciar sesión'),
    };
  } catch {
    return { ok: false, code: 'auth_failed', message: t('No se pudo conectar con el servidor') };
  }
}

export async function clearPendingLogin(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/pending`, { method: 'DELETE', credentials: 'include' });
  } catch {}
}

export async function completeOAuthCallback(token: string): Promise<Session> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, ...languageHeaders() },
  });
  if (!response.ok) throw new Error(t('No se pudo completar el inicio de sesión'));

  const { user, institutionLanguage, readingMaxChars, institutionPaused } = (await response.json()) as MeResponse;
  const session: Session = {
    token,
    user: toUser(user),
    provider: toLower<OAuthProviderId>(user.provider),
    issuedAt: new Date().toISOString(),
    institutionLanguage: isLocale(institutionLanguage) ? institutionLanguage : undefined,
    readingMaxChars,
    institutionPaused: institutionPaused ?? null,
  };
  sessionStore.set(session);
  applySessionLocale(session.user, session.institutionLanguage);
  return session;
}

export async function refreshSession(): Promise<Session | null> {
  const current = sessionStore.get();
  if (!current?.token) return null;

  try {
    const response = await authorizedFetch(`${API_URL}/auth/me`);
    if (!response.ok) {
      if (response.status === 401) {
        sessionStore.set(null);
        return null;
      }
      return sessionStore.get();
    }

    const { user, institutionLanguage, readingMaxChars, institutionPaused } = (await response.json()) as MeResponse;
    const latest = sessionStore.get() ?? current;
    const session: Session = {
      ...latest,
      user: toUser(user),
      provider: toLower<OAuthProviderId>(user.provider),
      institutionLanguage: isLocale(institutionLanguage) ? institutionLanguage : latest.institutionLanguage,
      readingMaxChars: readingMaxChars ?? latest.readingMaxChars,
      institutionPaused: institutionPaused ?? null,
    };
    sessionStore.set(session);
    applySessionLocale(session.user, session.institutionLanguage);
    return session;
  } catch {
    return current;
  }
}

export async function ensureAdminSession(): Promise<Session> {
  const current = sessionStore.get();
  if (current?.user.role === 'admin') return current;
  window.location.href = '/login';
  throw new Error(t('Se necesita una sesión de administración'));
}

export async function logout(): Promise<void> {
  const current = sessionStore.get();
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: current?.token ? { Authorization: `Bearer ${current.token}` } : {},
  }).catch(() => undefined);
  sessionStore.set(null);
}

export async function updateMyLanguage(language: Locale): Promise<void> {
  const { user } = await apiFetch<{ user: BackendUser }>('/auth/me/language', { method: 'PATCH', body: { language } });
  const current = sessionStore.get();
  if (current) sessionStore.set({ ...current, user: { ...current.user, language: isLocale(user.language) ? user.language : null } });
}

export function dashboardPathForRole(role: Role): string {
  if (role === 'admin') return '/admin/instituciones/nueva';
  if (role === 'coordinador' || role === 'director') return '/institucional';
  return '/docente/cursos';
}
