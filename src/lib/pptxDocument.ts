import JSZip from 'jszip';

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export interface PptxSlide {
  n: number;
  text: string;
  title: string;
}

export interface PptxInfo {
  width: number;
  height: number;
  slides: PptxSlide[];
}

const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MAX_SLIDE_XML = 6 * 1024 * 1024;

export const isPptx = (name: string, mimeType = '') => mimeType === PPTX_MIME || /\.pptx$/i.test(name);

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function slideText(xml: string): string[] {
  const doc = parseXml(xml);
  const lines: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(A_NS, 'p'))) {
    const text = Array.from(p.getElementsByTagNameNS(A_NS, 't'))
      .map((t) => t.textContent ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) lines.push(text);
  }
  return lines;
}

export async function readPptx(data: ArrayBuffer): Promise<PptxInfo> {
  const zip = await JSZip.loadAsync(data);
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string');
  if (!presentationXml) throw new Error('No es una presentación de PowerPoint válida.');
  const presentation = parseXml(presentationXml);

  const size = presentation.getElementsByTagName('p:sldSz')[0];
  const width = Number(size?.getAttribute('cx')) || 9144000;
  const height = Number(size?.getAttribute('cy')) || 5143500;

  const rels = new Map<string, string>();
  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (relsXml) {
    for (const rel of Array.from(parseXml(relsXml).getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `ppt/${target}`);
    }
  }
  let paths = Array.from(presentation.getElementsByTagName('p:sldId'))
    .map((s) => rels.get(s.getAttributeNS(R_NS, 'id') ?? ''))
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) {
    paths = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  }

  const slides: PptxSlide[] = [];
  for (const [i, path] of paths.entries()) {
    const entry = zip.file(path);
    const xml = entry ? await entry.async('string') : '';
    const lines = xml && xml.length <= MAX_SLIDE_XML ? slideText(xml) : [];
    slides.push({ n: i + 1, text: lines.join('\n'), title: lines[0] ?? '' });
  }
  if (slides.length === 0) throw new Error('La presentación no tiene diapositivas.');
  return { width, height, slides };
}

export function pptxText(info: PptxInfo, selected: number[]): string {
  const chosen = new Set(selected);
  return info.slides
    .filter((s) => chosen.has(s.n) && s.text)
    .map((s) => s.text)
    .join('\n\n');
}
