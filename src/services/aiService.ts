import type { ComprehensionAxis } from '../types/activity';
import type { Question } from '../types/question';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import type { Locale } from '../i18n';
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

/** La IA recupera el texto de la lectura a partir de lo que leyó el OCR, sin el ruido de las ilustraciones. */
export async function cleanScannedPage(rawText: string, language?: Locale): Promise<ScannedPageResult> {
  return apiFetch<ScannedPageResult>('/activities/clean-scanned-page', { method: 'POST', body: { rawText: rawText.slice(0, 12000), language } });
}

export async function generateQuestions(
  sourceText: string,
  focusAxis?: ComprehensionAxis,
  language?: Locale,
  questionTypes?: QuestionType[],
): Promise<GenerateQuestionsResult> {
  const result = await apiFetch<BackendGenerateQuestionsResponse>('/activities/generate-questions', {
    method: 'POST',
    body: { sourceText, focusAxis: focusAxis ? toUpper(focusAxis) : undefined, language, questionTypes },
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

export function readingMaxChars(): number {
  return sessionStore.get()?.readingMaxChars ?? DEFAULT_READING_MAX_CHARS;
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
