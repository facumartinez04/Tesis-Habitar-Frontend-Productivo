export type ScannedCodeType = 'course' | 'activity';

export interface ParsedQrCode {
  code: string;
  type: ScannedCodeType;
}

const COURSE_PREFIX = 'AULA-';
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Permite distinguir un PIN tipeado de una URL pegada (que no hay que mayusculizar). */
export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  return ABSOLUTE_URL.test(t) || t.startsWith('/');
}

/**
 * Un texto sólo se trata como URL si trae esquema o empieza con "/". Sin este
 * filtro `new URL('HAB-4B29', origin)` resuelve como ruta relativa y un PIN
 * suelto entra por la rama de URL.
 */
function asUrl(text: string): URL | null {
  if (!looksLikeUrl(text)) return null;
  try {
    return new URL(text, typeof window === 'undefined' ? 'https://habitar.lat' : window.location.origin);
  } catch {
    return null;
  }
}

/** `searchParams.get` distingue mayúsculas: un QR con `?CODE=` quedaría sin leer. */
function readCodeParam(url: URL): string {
  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase() === 'code') return value;
  }
  return '';
}

function segmentAfter(pathname: string, marker: string): string {
  const idx = pathname.indexOf(marker);
  if (idx === -1) return '';
  return pathname.slice(idx + marker.length).split('/')[0] ?? '';
}

function normalize(code: string): string {
  return decodeURIComponent(code.trim()).trim().toUpperCase();
}

/**
 * Acepta tanto la URL completa que codifica el QR (`/aula?code=…`,
 * `/actividad?code=…`) como un código tipeado a mano (`AULA-6A-7821`, `HAB-4B29`).
 */
export function parseScannedQr(rawText: string): ParsedQrCode {
  const text = rawText.trim();
  const url = asUrl(text);

  if (url) {
    const path = url.pathname.toLowerCase();
    const isCourse = path.includes('/aula');
    const type: ScannedCodeType = isCourse ? 'course' : 'activity';

    const fromQuery = readCodeParam(url);
    if (fromQuery) return { code: normalize(fromQuery), type };

    const fromPath = segmentAfter(path, isCourse ? '/aula/' : '/actividad/');
    if (fromPath) return { code: normalize(fromPath), type };

    // URL del dominio pero sin código: devolvemos vacío para que el llamador avise.
    return { code: '', type };
  }

  const code = normalize(text);
  return { code, type: code.startsWith(COURSE_PREFIX) ? 'course' : 'activity' };
}
