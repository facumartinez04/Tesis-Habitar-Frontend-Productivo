/**
 * Acceso de sólo lectura al OneDrive del docente (permiso Files.Read de Microsoft Graph). El archivo elegido se
 * descarga y se lee en el navegador: no pasa por el servidor ni se guarda.
 */
import type { IPublicClientApplication } from '@azure/msal-browser';
import { SUPPORTED_EXTENSIONS } from './documentText';

const SCOPES = ['Files.Read'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export interface DriveItem {
  id: string;
  name: string;
  isFolder: boolean;
  size: number;
  modified: string;
  supported: boolean;
}

let app: Promise<IPublicClientApplication> | null = null;

function getApp(clientId: string, tenantId: string): Promise<IPublicClientApplication> {
  if (!app) {
    app = (async () => {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const instance = new PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
          // Página mínima que devuelve la respuesta del login a esta ventana (src/pages/auth/microsoft.astro).
          redirectUri: `${window.location.origin}/auth/microsoft`,
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await instance.initialize();
      return instance;
    })().catch((err) => {
      app = null;
      throw err;
    });
  }
  return app;
}

export async function getOneDriveToken(config: { clientId: string; tenantId: string }, loginHint?: string): Promise<string> {
  const msal = await getApp(config.clientId, config.tenantId);
  const account =
    msal.getAllAccounts().find((a) => !loginHint || a.username.toLowerCase() === loginHint.toLowerCase()) ??
    msal.getAllAccounts()[0];
  if (account) {
    try {
      return (await msal.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
    } catch {
      // Sin token en caché o vencido: se pide con la ventana de Microsoft.
    }
  }
  try {
    const result = await msal.acquireTokenPopup({ scopes: SCOPES, loginHint, prompt: account ? undefined : 'select_account' });
    return result.accessToken;
  } catch (err) {
    const code = (err as { errorCode?: string }).errorCode;
    if (code === 'user_cancelled') throw new Error('Se cerró la ventana de Microsoft sin dar permiso.');
    if (code === 'popup_window_error') throw new Error('El navegador bloqueó la ventana de Microsoft. Permití las ventanas emergentes para habitar.lat.');
    throw new Error('No se pudo conectar con OneDrive.');
  }
}

async function graph<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`OneDrive respondió con error ${res.status}.`);
  return res.json() as Promise<T>;
}

interface GraphItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: unknown;
  file?: { mimeType?: string };
}

function toItem(item: GraphItem): DriveItem {
  const lower = item.name.toLowerCase();
  return {
    id: item.id,
    name: item.name,
    isFolder: Boolean(item.folder),
    size: item.size ?? 0,
    modified: item.lastModifiedDateTime ?? '',
    supported: Boolean(item.folder) || SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext)),
  };
}

/** Contenido de una carpeta (o de la raíz): carpetas primero y luego archivos, por nombre. */
export async function listFolder(token: string, folderId?: string): Promise<DriveItem[]> {
  const path = folderId ? `/me/drive/items/${encodeURIComponent(folderId)}/children` : '/me/drive/root/children';
  const data = await graph<{ value: GraphItem[] }>(token, `${path}?$top=200&$select=id,name,size,lastModifiedDateTime,folder,file`);
  return data.value.map(toItem).sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, 'es'));
}

export async function searchDrive(token: string, query: string): Promise<DriveItem[]> {
  const q = query.replace(/'/g, "''");
  const data = await graph<{ value: GraphItem[] }>(token, `/me/drive/root/search(q='${encodeURIComponent(q)}')?$top=50`);
  return data.value.map(toItem).filter((i) => !i.isFolder);
}

export async function downloadDriveFile(token: string, item: DriveItem): Promise<Blob> {
  const res = await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(item.id)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`OneDrive no entregó el archivo (error ${res.status}).`);
  return res.blob();
}
