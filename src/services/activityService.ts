import type { Activity, AttemptPolicy, ComprehensionAxis, DiagnosticType } from '../types/activity';
import type { StudentIdMode } from '../lib/studentDevice';
import { ApiError } from '../lib/apiClient';
import type { Question } from '../types/question';
import { apiFetch, apiUrl, authorizedFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import { isLocale, t, type Locale } from '../i18n';
import type { QuestionType } from '../types/question';

export interface CreateActivityInput {
  name: string;
  courseId: string;
  educationLevel: string;
  axis: ComprehensionAxis;
  sourceText: string;
  availableFrom: string;
  startTime: string;
  endDate?: string;
  endTime: string;
  attemptPolicy: AttemptPolicy;
  questions: Question[];
  diagnosticType?: DiagnosticType | null;
  readingMode?: ReadingMode;
  readingHelp?: boolean;
  showFeedback?: boolean;
  templateId?: string | null;
  language?: Locale;
}

export type ReadingMode = 'LECTURA_PRIMERO' | 'DOCENTE_HABILITA' | 'LIBRE';

interface BackendActivity {
  id: string;
  code: string;
  name: string;
  educationLevel: string;
  axis: string;
  sourceText: string | null;
  availableFrom: string;
  startTime: string;
  endDate?: string | null;
  endTime: string;
  attemptPolicy: string;
  status: string;
  qrValidUntil: string;
  courseId: string;
  diagnosticType?: string | null;
  readingMode?: ReadingMode;
  questionsReleasedAt?: string | null;
  readingHelp?: boolean;
  language?: string;
}

interface BackendQuestion {
  id: string;
  axis: string;
  type?: QuestionType;
  prompt: string;
  expectedAnswer?: string;
  options: string[] | null;
  correctOption?: string | null;
  correctOptions?: string[] | null;
  acceptedAnswers?: string[] | null;
  edited: boolean;
  approved: boolean;
}

interface GetActivityResponse {
  activity: BackendActivity;
  document?: ActivityDocumentMeta | null;
  questions: BackendQuestion[];
  questionCount?: number;
  questionsReleased?: boolean;
  studentIdMode: 'LISTA' | 'NOMBRE';
  institutionLanguage?: string;
}

export interface SubmitResponseResult {
  responseId: string;
  submittedAt: string;
}

function toActivity(backendActivity: BackendActivity, responsesCount = 0): Activity {
  return {
    id: backendActivity.id,
    code: backendActivity.code,
    name: backendActivity.name,
    courseId: backendActivity.courseId,
    educationLevel: backendActivity.educationLevel,
    axis: toLower<ComprehensionAxis>(backendActivity.axis),
    sourceText: backendActivity.sourceText,
    availableFrom: backendActivity.availableFrom,
    startTime: backendActivity.startTime,
    endDate: backendActivity.endDate ?? backendActivity.availableFrom,
    endTime: backendActivity.endTime,
    attemptPolicy: toLower<AttemptPolicy>(backendActivity.attemptPolicy),
    status: toLower<Activity['status']>(backendActivity.status),
    qrValidUntil: backendActivity.qrValidUntil,
    responsesCount,
    diagnosticType: backendActivity.diagnosticType ? toLower<DiagnosticType>(backendActivity.diagnosticType) : null,
  };
}

function toQuestion(backendQuestion: BackendQuestion): Question {
  return {
    id: backendQuestion.id,
    axis: toLower<ComprehensionAxis>(backendQuestion.axis),
    type: backendQuestion.type,
    prompt: backendQuestion.prompt,
    expectedAnswer: backendQuestion.expectedAnswer ?? '',
    options: backendQuestion.options ?? undefined,
    correctOption: backendQuestion.correctOption ?? undefined,
    correctOptions: backendQuestion.correctOptions ?? undefined,
    acceptedAnswers: backendQuestion.acceptedAnswers ?? undefined,
    edited: backendQuestion.edited,
    approved: backendQuestion.approved,
  };
}

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const backendActivity = await apiFetch<BackendActivity>('/activities', {
    method: 'POST',
    body: {
      name: input.name,
      courseId: input.courseId,
      educationLevel: input.educationLevel,
      axis: toUpper(input.axis),
      sourceText: input.sourceText,
      availableFrom: input.availableFrom,
      startTime: input.startTime,
      endDate: input.endDate && input.endDate !== input.availableFrom ? input.endDate : null,
      endTime: input.endTime,
      attemptPolicy: toUpper(input.attemptPolicy),
      diagnosticType: input.diagnosticType ? toUpper(input.diagnosticType) : null,
      readingMode: input.readingMode ?? 'LECTURA_PRIMERO',
      readingHelp: input.readingHelp ?? true,
      showFeedback: input.showFeedback ?? true,
      ...(input.language ? { language: input.language } : {}),
      ...(input.templateId ? { templateId: input.templateId } : {}),
      questions: input.questions.map((question) => ({
        axis: toUpper(question.axis),
        type: question.type,
        prompt: question.prompt,
        expectedAnswer: question.expectedAnswer,
        options: question.options,
        correctOption: question.correctOption,
        correctOptions: question.correctOptions,
        acceptedAnswers: question.acceptedAnswers,
        approved: question.approved,
        edited: question.edited,
      })),
    },
  });

  return toActivity(backendActivity);
}

export type PublicActivityResult =
  | {
      ok: true;
      activity: Activity;
      questions: Question[];
      studentIdMode: StudentIdMode;
      language: Locale;
      readingMode: ReadingMode;
      questionsReleased: boolean;
      questionsReleasedAt: string | null;
      questionCount: number;
      readingHelp: boolean;
      document: ActivityDocumentMeta | null;
    }
  | { ok: false; notFound: boolean; message: string };

export async function getActivityByCode(code: string): Promise<PublicActivityResult> {
  try {
    const result = await apiFetch<GetActivityResponse>(`/activities/${code}`, { auth: false });
    return {
      ok: true,
      activity: toActivity(result.activity),
      questions: result.questions.map(toQuestion),
      studentIdMode: result.studentIdMode === 'NOMBRE' ? 'nombre' : 'lista',
      language: isLocale(result.activity.language) ? result.activity.language : isLocale(result.institutionLanguage) ? result.institutionLanguage : 'es',
      readingMode: result.activity.readingMode ?? 'LECTURA_PRIMERO',
      questionsReleased: result.questionsReleased ?? true,
      questionsReleasedAt: result.activity.questionsReleasedAt ?? null,
      questionCount: result.questionCount ?? result.questions.length,
      readingHelp: result.activity.readingHelp ?? true,
      document: result.document ?? null,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status !== 404) {
      return { ok: false, notFound: false, message: err.message };
    }
    return { ok: false, notFound: true, message: '' };
  }
}

export interface ActivitySummary {
  id: string;
  code: string;
  name: string;
  status: 'borrador' | 'programada' | 'publicada' | 'cerrada';
  availableFrom: string;
}

export async function listActivitiesByCourse(courseId: string): Promise<ActivitySummary[]> {
  const backend = await apiFetch<BackendActivity[]>(`/activities/course/${courseId}`);
  return backend.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    status: toLower<ActivitySummary['status']>(a.status),
    availableFrom: a.availableFrom,
  }));
}

export async function duplicateActivity(activityId: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/duplicate`, { method: 'POST' });
}

export async function publishActivityNow(activityId: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/publish`, { method: 'POST' });
}

export interface AnswerPayload {
  questionId: string;
  selectedOption?: string;
  selectedOptions?: string[];
  textAnswer?: string;
}

export async function submitResponse(
  code: string,
  studentDisplayName: string,
  deviceId: string,
  answers: AnswerPayload[],
): Promise<SubmitResponseResult> {
  return apiFetch<SubmitResponseResult>(`/activities/${code}/responses`, {
    method: 'POST',
    auth: false,
    body: { studentDisplayName, deviceId, answers },
  });
}

export type DraftAnswers = Record<string, { selectedOption?: string; selectedOptions?: string[]; textAnswer?: string }>;

export interface StudentState {
  status: 'NUEVO' | 'EN_CURSO' | 'ENVIADO';
  phase: 'LEYENDO' | 'RESPONDIENDO' | 'ENVIADO' | null;
  currentIndex: number;
  answers: DraftAnswers;
  canRetry: boolean;
}

export async function getStudentState(code: string, studentDisplayName: string, deviceId: string): Promise<StudentState> {
  return apiFetch<StudentState>(`/activities/${code}/me`, {
    method: 'POST',
    auth: false,
    body: { studentDisplayName, deviceId },
  });
}

export async function saveProgress(
  code: string,
  input: {
    studentDisplayName: string;
    deviceId: string;
    phase: 'LEYENDO' | 'RESPONDIENDO';
    currentIndex: number;
    answers: DraftAnswers;
    retry?: boolean;
  },
): Promise<void> {
  await apiFetch(`/activities/${code}/progress`, { method: 'POST', auth: false, body: input });
}

export async function releaseQuestions(activityId: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/release`, { method: 'POST' });
}

export async function editLiveQuestion(
  activityId: string,
  questionId: string,
  input: { prompt?: string; options?: string[]; correctOption?: string; correctOptions?: string[]; acceptedAnswers?: string[]; expectedAnswer?: string },
): Promise<void> {
  await apiFetch(`/activities/${activityId}/questions/${questionId}`, { method: 'PATCH', body: input });
}

export interface HelpMessage {
  id: string;
  question: string;
  answer: string;
  declined: boolean;
  createdAt: string;
}

export async function getHelpConversation(
  code: string,
  studentDisplayName: string,
  deviceId: string,
): Promise<{ enabled: boolean; remaining: number; messages: HelpMessage[] }> {
  return apiFetch(`/activities/${code}/help/history`, { method: 'POST', auth: false, body: { studentDisplayName, deviceId } });
}

export async function askReadingHelp(
  code: string,
  studentDisplayName: string,
  deviceId: string,
  question: string,
): Promise<{ message: HelpMessage; remaining: number }> {
  return apiFetch(`/activities/${code}/help`, { method: 'POST', auth: false, body: { studentDisplayName, deviceId, question } });
}

export interface ActivityDocumentMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pages: number[] | null;
}

export async function uploadActivityDocument(
  activityId: string,
  doc: { name: string; mimeType: string; file: Blob; pages: number[] | null },
): Promise<ActivityDocumentMeta> {
  const res = await authorizedFetch(apiUrl(`/activities/${activityId}/document`), {
    method: 'POST',
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(doc.name),
      ...(doc.pages ? { 'X-Pages': doc.pages.join(',') } : {}),
    },
    body: doc.file,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? (res.status === 413 ? t('El archivo supera los 15 MB') : t('No se pudo subir el documento')));
  return data as ActivityDocumentMeta;
}

export async function fetchActivityDocument(code: string): Promise<Blob> {
  const res = await fetch(apiUrl(`/activities/${code}/document`));
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? t('No se pudo abrir el documento'));
  }
  return res.blob();
}

export interface StudentFeedback {
  activityName: string;
  submittedAt: string;
  scores: { literal: number | null; inferencial: number | null; critico: number | null; criticoPending: boolean };
  questions: {
    axis: 'LITERAL' | 'INFERENCIAL' | 'CRITICO';
    type?: QuestionType;
    prompt: string;
    options: string[] | null;
    selectedOption: string | null;
    selectedOptions?: string[] | null;
    correctOption: string | null;
    correctOptions?: string[] | null;
    acceptedAnswers?: string[] | null;
    correct: boolean | null;
    partial?: number | null;
    textAnswer: string | null;
    score: number | null;
    scoreLabel: string | null;
    pendingReview: boolean;
  }[];
}

export async function getStudentFeedback(code: string, studentDisplayName: string, deviceId: string): Promise<StudentFeedback> {
  return apiFetch(`/activities/${code}/feedback`, { method: 'POST', auth: false, body: { studentDisplayName, deviceId } });
}

export interface ActivityTemplateSummary {
  id: string;
  name: string;
  educationLevel: string;
  axis: string;
  language?: Locale;
  authorName: string;
  questionCount: number;
  wordCount: number;
  hasDocument: boolean;
  documentFileName: string | null;
  uses: number;
  createdAt: string;
  mine: boolean;
}

export async function listActivityTemplates(q = ''): Promise<ActivityTemplateSummary[]> {
  return apiFetch(`/activities/templates${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export async function fetchActivityTemplate(id: string): Promise<{ template: ActivityTemplateSummary; sourceText: string; questions: Question[] }> {
  const data = await apiFetch<ActivityTemplateSummary & { sourceText: string; questions: BackendQuestion[] }>(`/activities/templates/${id}/use`, {
    method: 'POST',
  });
  const { sourceText, questions, ...template } = data;
  return {
    template: { ...template, mine: false },
    sourceText,
    questions: questions.map((q, i) => ({ ...toQuestion({ ...q, id: `banco-${id}-${i}`, edited: false, approved: true }) })),
  };
}

export async function deleteActivityTemplate(id: string): Promise<void> {
  await apiFetch(`/activities/templates/${id}`, { method: 'DELETE' });
}

export async function saveActivityAsTemplate(activityId: string): Promise<ActivityTemplateSummary> {
  return apiFetch(`/activities/${activityId}/save-template`, { method: 'POST' });
}

export async function closeActivityNow(activityId: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/close`, { method: 'POST' });
}

export interface ReviewItem {
  answerId: string;
  responseId: string;
  studentDisplayName: string;
  submittedAt: string;
  questionPrompt: string;
  expectedAnswer: string;
  textAnswer: string | null;
  aiScore: number | null;
  aiRationale: string | null;
  teacherScore: number | null;
  reviewedAt: string | null;
}

export interface ReviewQueue {
  pending: number;
  items: ReviewItem[];
}

export async function getReviewQueue(activityId: string): Promise<ReviewQueue> {
  return apiFetch<ReviewQueue>(`/activities/${activityId}/reviews`);
}

export async function reviewAnswer(activityId: string, answerId: string, score: number): Promise<ReviewQueue> {
  return apiFetch<ReviewQueue>(`/activities/${activityId}/answers/${answerId}/review`, {
    method: 'PATCH',
    body: { score },
  });
}

export interface LiveActivity {
  id: string;
  code: string;
  name: string;
  status: 'BORRADOR' | 'PROGRAMADA' | 'PUBLICADA' | 'CERRADA';
  attemptPolicy: 'UNICO' | 'REINTENTOS';
  diagnosticType: 'INICIO' | 'CIERRE' | null;
  availableFrom: string;
  startTime: string;
  endDate: string;
  endTime: string;
  opensAt: string | null;
  closesAt: string | null;
  courseId: string;
  courseName: string;
  courseQrCode: string | null;
  questionCount: number;
  devicesInClassroom: number;
  pendingReviews: number;
  readingMode: ReadingMode;
  questionsReleasedAt: string | null;
  students: LiveStudent[];
  integrityEvents: {
    id: string;
    kind: 'OTRO_DISPOSITIVO' | 'DISPOSITIVO_COMPARTIDO';
    studentDisplayName: string;
    otherStudent: string | null;
    createdAt: string;
  }[];
  questions: LiveQuestion[];
  readingHelp: boolean;
  helpQuestions: {
    id: string;
    studentDisplayName: string;
    question: string;
    answer: string;
    declined: boolean;
    createdAt: string;
  }[];
  responses: {
    responseId: string;
    studentDisplayName: string;
    submittedAt: string;
    scores: { literal: number | null; inferencial: number | null; critico: number | null };
    criticoPending: boolean;
  }[];
}

export interface LiveStudent {
  studentDisplayName: string;
  phase: 'LEYENDO' | 'RESPONDIENDO' | 'ENVIADO';
  currentIndex: number;
  answeredCount: number;
  startedAt: string;
  updatedAt: string;
  deviceTag: string;
}

export interface LiveQuestion {
  id: string;
  axis: 'LITERAL' | 'INFERENCIAL' | 'CRITICO';
  type?: QuestionType;
  prompt: string;
  options: string[] | null;
  correctOption: string | null;
  correctOptions?: string[] | null;
  acceptedAnswers?: string[] | null;
  expectedAnswer: string;
}

export async function getActivityLive(activityId: string): Promise<LiveActivity> {
  return apiFetch<LiveActivity>(`/activities/${activityId}/live`);
}

/** Qué respondió un alumno en una pregunta y si está bien (vista de la docente). */
export interface ResponseDetailQuestion {
  axis: 'LITERAL' | 'INFERENCIAL' | 'CRITICO';
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  selectedOption: string | null;
  selectedOptions: string[] | null;
  correctOption: string | null;
  correctOptions: string[] | null;
  acceptedAnswers: string[] | null;
  /** true/false en las de respuesta cerrada; null en las abiertas. */
  correct: boolean | null;
  /** Porcentaje cuando está parcialmente bien (opción múltiple). */
  partial: number | null;
  textAnswer: string | null;
  score: number | null;
  scoreLabel: string | null;
  pendingReview: boolean;
  aiScore: number | null;
  aiRationale: string | null;
  teacherScore: number | null;
  reviewed: boolean;
}

export interface ResponseDetail {
  responseId: string;
  studentDisplayName: string;
  submittedAt: string;
  scores: { literal: number | null; inferencial: number | null; critico: number | null; criticoPending: boolean };
  summary: { closed: number; correct: number; partial: number; incorrect: number; open: number; openPending: number };
  questions: ResponseDetailQuestion[];
}

export async function getResponseDetail(activityId: string, responseId: string): Promise<ResponseDetail> {
  return apiFetch<ResponseDetail>(`/activities/${activityId}/responses/${responseId}`);
}
