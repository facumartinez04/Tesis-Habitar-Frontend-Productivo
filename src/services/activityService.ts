import type { Activity, AttemptPolicy, ComprehensionAxis, DiagnosticType } from '../types/activity';
import type { StudentIdMode } from '../lib/studentDevice';
import { ApiError } from '../lib/apiClient';
import type { Question } from '../types/question';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';

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
}

/** Cómo empieza el alumno: lee primero (por defecto), espera que el docente habilite las preguntas, o todo junto. */
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
}

interface BackendQuestion {
  id: string;
  axis: string;
  prompt: string;
  /** La vista pública del alumno no trae la respuesta esperada ni la opción correcta. */
  expectedAnswer?: string;
  options: string[] | null;
  correctOption?: string | null;
  edited: boolean;
  approved: boolean;
}

interface GetActivityResponse {
  activity: BackendActivity;
  questions: BackendQuestion[];
  questionCount?: number;
  questionsReleased?: boolean;
  studentIdMode: 'LISTA' | 'NOMBRE';
}

/** El alumno sólo recibe la confirmación del envío: los puntajes los ve el docente. */
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
    prompt: backendQuestion.prompt,
    expectedAnswer: backendQuestion.expectedAnswer ?? '',
    options: backendQuestion.options ?? undefined,
    correctOption: backendQuestion.correctOption ?? undefined,
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
      questions: input.questions.map((question) => ({
        axis: toUpper(question.axis),
        prompt: question.prompt,
        expectedAnswer: question.expectedAnswer,
        options: question.options,
        correctOption: question.correctOption,
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
      readingMode: ReadingMode;
      /** false mientras el docente no habilite las preguntas: todavía no llegan al celular. */
      questionsReleased: boolean;
      /** Cuándo el docente pasó a todos a las preguntas (null si todavía no lo hizo). */
      questionsReleasedAt: string | null;
      questionCount: number;
    }
  | { ok: false; notFound: boolean; message: string };

/** Vista del alumno: el backend no envía las opciones correctas ni las respuestas esperadas. */
export async function getActivityByCode(code: string): Promise<PublicActivityResult> {
  try {
    const result = await apiFetch<GetActivityResponse>(`/activities/${code}`, { auth: false });
    return {
      ok: true,
      activity: toActivity(result.activity),
      questions: result.questions.map(toQuestion),
      studentIdMode: result.studentIdMode === 'NOMBRE' ? 'nombre' : 'lista',
      readingMode: result.activity.readingMode ?? 'LECTURA_PRIMERO',
      questionsReleased: result.questionsReleased ?? true,
      questionsReleasedAt: result.activity.questionsReleasedAt ?? null,
      questionCount: result.questionCount ?? result.questions.length,
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

export type DraftAnswers = Record<string, { selectedOption?: string; textAnswer?: string }>;

export interface StudentState {
  /** NUEVO: no empezó. EN_CURSO: tiene un borrador. ENVIADO: ya completó la actividad. */
  status: 'NUEVO' | 'EN_CURSO' | 'ENVIADO';
  phase: 'LEYENDO' | 'RESPONDIENDO' | 'ENVIADO' | null;
  currentIndex: number;
  answers: DraftAnswers;
  canRetry: boolean;
}

/** Estado del alumno al entrar: si ya envió no puede volver a empezar; si tenía un borrador, lo retoma. */
export async function getStudentState(code: string, studentDisplayName: string, deviceId: string): Promise<StudentState> {
  return apiFetch<StudentState>(`/activities/${code}/me`, {
    method: 'POST',
    auth: false,
    body: { studentDisplayName, deviceId },
  });
}

/** Avance del alumno: lo ve el docente en vivo y permite retomar desde otro momento (no desde otro celular). */
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

/** El docente pasa a todos los alumnos a las preguntas. */
export async function releaseQuestions(activityId: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/release`, { method: 'POST' });
}

/** El docente corrige una pregunta durante la actividad; los alumnos la reciben al instante, sin la respuesta correcta. */
export async function editLiveQuestion(
  activityId: string,
  questionId: string,
  input: { prompt?: string; options?: string[]; correctOption?: string; expectedAnswer?: string },
): Promise<void> {
  await apiFetch(`/activities/${activityId}/questions/${questionId}`, { method: 'PATCH', body: input });
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

/** Bandeja de revisión de respuestas abiertas: propuesta de la IA y confirmación del docente. */
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
  /** Últimos caracteres del dispositivo, para distinguir celulares. */
  deviceTag: string;
}

export interface LiveQuestion {
  id: string;
  axis: 'LITERAL' | 'INFERENCIAL' | 'CRITICO';
  prompt: string;
  options: string[] | null;
  correctOption: string | null;
  expectedAnswer: string;
}

/** Estado en vivo de la actividad para el panel del docente. */
export async function getActivityLive(activityId: string): Promise<LiveActivity> {
  return apiFetch<LiveActivity>(`/activities/${activityId}/live`);
}
