import type { Activity, AttemptPolicy, ComprehensionAxis } from '../types/activity';
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
  endTime: string;
  attemptPolicy: AttemptPolicy;
  questions: Question[];
}

interface BackendActivity {
  id: string;
  code: string;
  name: string;
  educationLevel: string;
  axis: string;
  sourceText: string;
  availableFrom: string;
  startTime: string;
  endTime: string;
  attemptPolicy: string;
  status: string;
  qrValidUntil: string;
  courseId: string;
}

interface BackendQuestion {
  id: string;
  axis: string;
  prompt: string;
  expectedAnswer: string;
  options: string[] | null;
  correctOption: string | null;
  edited: boolean;
  approved: boolean;
}

interface GetActivityResponse {
  activity: BackendActivity;
  questions: BackendQuestion[];
  responsesCount: number;
}

interface SubmitResponseResult {
  responseId: string;
  resultId: string;
  scores: { literal: number; inferencial: number; critico: number };
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
    endTime: backendActivity.endTime,
    attemptPolicy: toLower<AttemptPolicy>(backendActivity.attemptPolicy),
    status: toLower<Activity['status']>(backendActivity.status),
    qrValidUntil: backendActivity.qrValidUntil,
    responsesCount,
  };
}

function toQuestion(backendQuestion: BackendQuestion): Question {
  return {
    id: backendQuestion.id,
    axis: toLower<ComprehensionAxis>(backendQuestion.axis),
    prompt: backendQuestion.prompt,
    expectedAnswer: backendQuestion.expectedAnswer,
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
      endTime: input.endTime,
      attemptPolicy: toUpper(input.attemptPolicy),
      questions: input.questions.map((question) => ({
        axis: toUpper(question.axis),
        prompt: question.prompt,
        expectedAnswer: question.expectedAnswer,
        options: question.options,
        correctOption: question.correctOption,
        approved: question.approved,
      })),
    },
  });

  return toActivity(backendActivity);
}

export async function getActivityByCode(code: string): Promise<{ activity: Activity; questions: Question[] } | undefined> {
  try {
    const result = await apiFetch<GetActivityResponse>(`/activities/${code}`, { auth: false });
    return {
      activity: toActivity(result.activity, result.responsesCount),
      questions: result.questions.map(toQuestion),
    };
  } catch {
    return undefined;
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

export async function submitResponse(
  code: string,
  studentDisplayName: string,
  answers: { questionId: string; selectedOption: string }[],
): Promise<SubmitResponseResult> {
  return apiFetch<SubmitResponseResult>(`/activities/${code}/responses`, {
    method: 'POST',
    auth: false,
    body: { studentDisplayName, answers },
  });
}
