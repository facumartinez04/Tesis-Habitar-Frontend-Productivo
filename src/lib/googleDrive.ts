/**
 * Elegir un texto desde Google Drive con el selector oficial de Google.
 * Usa el permiso drive.file: Habitar sólo puede leer el archivo que el docente elige, nada más de su Drive,
 * y el archivo se lee en el navegador (no pasa por el servidor).
 */
import { extractText, SUPPORTED_MIME_TYPES } from './documentText';

const GOOGLE_DOC = 'application/vnd.google-apps.document';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Drive. Revisá la conexión.'));
    document.head.appendChild(script);
  });
}

let token: { value: string; expiresAt: number } | null = null;

async function getAccessToken(clientId: string, loginHint?: string): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  await loadScript('https://accounts.google.com/gsi/client');
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      login_hint: loginHint,
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error('No se dio permiso para acceder a Google Drive.'));
          return;
        }
        token = { value: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 };
        resolve(response.access_token);
      },
      error_callback: (err: { type?: string }) =>
        reject(new Error(err?.type === 'popup_closed' ? 'Se cerró la ventana de Google sin dar permiso.' : 'No se pudo conectar con Google Drive.')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function loadPicker(): Promise<void> {
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve) => window.gapi.load('picker', () => resolve()));
}

interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
}

function openPicker(accessToken: string, apiKey: string, appId: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const { picker } = window.google;
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes([GOOGLE_DOC, ...SUPPORTED_MIME_TYPES].join(','))
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    const builder = new picker.PickerBuilder().setAppId(appId).setOAuthToken(accessToken);
    // La clave de API es opcional cuando hay token OAuth; si el servidor la tiene configurada, se usa.
    if (apiKey) builder.setDeveloperKey(apiKey);
    builder
      .addView(view)
      .addView(new picker.DocsView(picker.ViewId.DOCS).setMimeTypes(GOOGLE_DOC).setOwnedByMe(false))
      .setLocale('es-419')
      .setTitle('Elegí el texto de la actividad')
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED && data.docs?.[0]) {
          const doc = data.docs[0];
          resolve({ id: doc.id, name: doc.name, mimeType: doc.mimeType });
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}

async function download(file: PickedFile, accessToken: string): Promise<string> {
  const base = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`;
  const url =
    file.mimeType === GOOGLE_DOC ? `${base}/export?mimeType=text/plain` : `${base}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Drive no entregó el archivo (error ${res.status}).`);
  return extractText(await res.blob(), file.name, file.mimeType === GOOGLE_DOC ? 'text/plain' : file.mimeType);
}

export async function pickTextFromGoogleDrive(
  config: { clientId: string; apiKey: string; appId: string },
  loginHint?: string,
): Promise<{ name: string; text: string } | null> {
  const [accessToken] = await Promise.all([getAccessToken(config.clientId, loginHint), loadPicker()]);
  const file = await openPicker(accessToken, config.apiKey, config.appId);
  if (!file) return null;
  return { name: file.name, text: await download(file, accessToken) };
}
