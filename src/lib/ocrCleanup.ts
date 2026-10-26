import { normalizeText } from './documentText';

export interface OcrWord {
  text: string;
  confidence: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  words: OcrWord[];
}

export interface OcrResult {
  /** Texto con las líneas que parecen lectura; el ruido de las ilustraciones queda afuera. */
  text: string;
  /** Todo lo que leyó el OCR, sin filtrar: es lo que se manda a la IA para reconstruir la página. */
  raw: string;
  /** true cuando lo que quedó no alcanza para confiar en el OCR solo. */
  unclear: boolean;
}

const LETTERS = /[a-záéíóúüñ]/gi;
const MIN_WORD_CONFIDENCE = 60;
const MIN_LINE_CONFIDENCE = 55;

function letterCount(value: string): number {
  return value.match(LETTERS)?.length ?? 0;
}

function isRealWord(word: OcrWord): boolean {
  const clean = word.text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  return word.confidence >= MIN_WORD_CONFIDENCE && clean.length >= 2 && letterCount(clean) === clean.length;
}

function isJunkToken(word: OcrWord): boolean {
  return !isRealWord(word) || letterCount(word.text) <= 1;
}

/** Saca las tiras de letras sueltas que el OCR pega al principio o al final de una línea (bordes del dibujo). */
export function trimJunkEdges(line: OcrLine): OcrLine {
  const words = line.words.filter((w) => w.text.trim());
  let start = 0;
  while (start < words.length && isJunkToken(words[start])) start += 1;
  let end = words.length;
  while (end > start && isJunkToken(words[end - 1])) end -= 1;
  // Una sola palabra corta en un borde puede ser real ("y", "a"): sólo se cortan tiras de dos o más.
  if (start === 1 && letterCount(words[0].text) > 0) start = 0;
  if (words.length - end === 1 && letterCount(words[words.length - 1].text) > 0) end = words.length;
  if (start === 0 && end === words.length) return line;
  const kept = words.slice(start, end);
  return { ...line, words: kept, text: kept.map((w) => w.text).join(' ') };
}

/** Una línea es lectura si la mayoría de sus palabras son palabras de verdad y al menos una es larga. */
export function looksLikeText(line: OcrLine): boolean {
  const words = line.words.filter((w) => w.text.trim());
  if (words.length === 0 || line.confidence < MIN_LINE_CONFIDENCE) return false;
  const real = words.filter(isRealWord);
  const hasLongWord = real.some((w) => letterCount(w.text) >= 4);
  return hasLongWord && real.length / words.length >= 0.6;
}

function joinLines(lines: string[]): string {
  return normalizeText(
    lines
      .join('\n')
      .replace(/-\n(?=[a-záéíóúñ])/g, '')
      .replace(/([^.!?:;\n])\n+(?=[a-záéíóúñ0-9])/g, '$1 '),
  );
}

export function cleanOcrLines(lines: OcrLine[], minChars: number): OcrResult {
  const kept = lines.map(trimJunkEdges).filter(looksLikeText);
  const text = joinLines(kept.map((l) => l.text.trim()));
  const raw = joinLines(lines.map((l) => l.text.trim()).filter(Boolean));
  const totalLetters = letterCount(raw);
  const keptLetters = letterCount(text);
  const keptWords = kept.flatMap((l) => l.words);
  const avgConfidence = keptWords.length ? keptWords.reduce((sum, w) => sum + w.confidence, 0) / keptWords.length : 0;
  const unclear =
    text.replace(/\s/g, '').length < minChars || avgConfidence < 80 || (totalLetters > 0 && keptLetters / totalLetters < 0.75);
  return { text, raw, unclear };
}
