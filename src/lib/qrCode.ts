export type ScannedCodeType = 'course' | 'activity';

export interface ParsedQrCode {
  code: string;
  type: ScannedCodeType;
}

const COURSE_PREFIX = 'AULA-';
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;


export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  return ABSOLUTE_URL.test(t) || t.startsWith('/');
}


function asUrl(text: string): URL | null {
  if (!looksLikeUrl(text)) return null;
  try {
    return new URL(text, typeof window === 'undefined' ? 'https://habitar.lat' : window.location.origin);
  } catch {
    return null;
  }
}


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

    return { code: '', type };
  }

  const code = normalize(text);
  return { code, type: code.startsWith(COURSE_PREFIX) ? 'course' : 'activity' };
}
