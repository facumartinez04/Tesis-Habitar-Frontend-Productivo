import type { ComprehensionAxis } from '../types/activity';
import type { Question } from '../types/question';
import { ApiError, apiFetch, apiUrl, authorizedFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import { t, type Locale } from '../i18n';
import { sessionStore } from '../store/sessionStore';
import type { QuestionType } from '../types/question';

export interface GenerateQuestionsResult {
  questions: Question[];
  wordCount: number;
}

interface BackendGeneratedQuestion {
  axis: string;
  type?: QuestionType;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  correctOption?: string;
  correctOptions?: string[];
  acceptedAnswers?: string[];
  approved: boolean;
}

interface BackendGenerateQuestionsResponse {
  wordCount: number;
  isValid: boolean;
  questions: BackendGeneratedQuestion[];
}

export interface ScannedPageResult {
  text: string;
  legible: boolean;
}

/** Páginas que se pueden leer con IA de una vez (el servidor rechaza más). */
export const MAX_AI_PAGES = 60;

/**
 * La IA (DeepSeek) lee las páginas elegidas del PDF en lugar del OCR del navegador.
 * Solo se envían las páginas elegidas y el servidor borra el archivo de DeepSeek apenas termina.
 */
export async function readDocumentWithAi(file: Blob, pages: number[]): Promise<ScannedPageResult> {
  const res = await authorizedFetch(apiUrl('/activities/read-document'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'X-Pages': pages.join(',') },
    body: file,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? (res.status === 413 ? t('El archivo supera los 15 MB') : t('No se pudo leer el documento con IA')));
  return data as ScannedPageResult;
}

/** La IA recupera el texto de la lectura a partir de lo que leyó el OCR, sin el ruido de las ilustraciones. */
export async function cleanScannedPage(rawText: string, language?: Locale): Promise<ScannedPageResult> {
  return apiFetch<ScannedPageResult>('/activities/clean-scanned-page', { method: 'POST', body: { rawText: rawText.slice(0, 12000), language } });
}

export async function generateQuestions(
  sourceText: string,
  focusAxis?: ComprehensionAxis,
  language?: Locale,
  questionTypes?: QuestionType[],
  fromDocument?: boolean,
): Promise<GenerateQuestionsResult> {
  const result = await apiFetch<BackendGenerateQuestionsResponse>('/activities/generate-questions', {
    method: 'POST',
    body: { sourceText, focusAxis: focusAxis ? toUpper(focusAxis) : undefined, language, questionTypes, ...(fromDocument ? { fromDocument: true } : {}) },
  });

  const questions: Question[] = result.questions.map((question, index) => ({
    id: `draft-${index}`,
    axis: toLower<ComprehensionAxis>(question.axis),
    type: question.type,
    prompt: question.prompt,
    expectedAnswer: question.expectedAnswer,
    options: question.options,
    correctOption: question.correctOption,
    correctOptions: question.correctOptions,
    acceptedAnswers: question.acceptedAnswers,
    edited: false,
    approved: question.approved,
  }));

  return { questions, wordCount: result.wordCount };
}

export const MIN_READING_WORDS = 40;
export const DEFAULT_READING_MAX_CHARS = 5000;

/** Techo técnico del texto leído de un documento (igual al del servidor). El peso del archivo (15 MB) y las páginas son el límite visible. */
export const DOCUMENT_READING_MAX_CHARS = 50000;

export function readingMaxChars(fromDocument = false): number {
  const own = sessionStore.get()?.readingMaxChars ?? DEFAULT_READING_MAX_CHARS;
  return fromDocument ? Math.max(own, DOCUMENT_READING_MAX_CHARS) : own;
}

export interface ReadingLength {
  words: number;
  chars: number;
  maxChars: number;
  tooShort: boolean;
  tooLong: boolean;
  valid: boolean;
}

export function readingLength(text: string, maxChars = readingMaxChars()): ReadingLength {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;
  const tooShort = words < MIN_READING_WORDS;
  const tooLong = chars > maxChars;
  return { words, chars, maxChars, tooShort, tooLong, valid: !tooShort && !tooLong };
}
