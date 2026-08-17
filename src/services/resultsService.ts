import type { AxisScores, CourseResultSummary, InstitutionResultSummary, PerformanceStatus } from '../types/result';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';
import { sessionStore } from '../store/sessionStore';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface BackendStudentResultRow {
  studentId: string;
  studentName: string;
  scores: AxisScores | null;
  status: string;
}

interface BackendCourseResultSummary {
  courseId: string;
  courseName: string;
  teacherName: string;
  studentCount: number;
  activityCount: number;
  averages: AxisScores;
  status: string;
  rows: BackendStudentResultRow[];
}

interface BackendInstitutionResultSummary {
  institutionId: string;
  institutionName: string;
  averages: AxisScores;
  totalActivities: number;
  courses: BackendCourseResultSummary[];
}

function toCourseSummary(backend: BackendCourseResultSummary): CourseResultSummary {
  return {
    courseId: backend.courseId,
    courseName: backend.courseName,
    teacherName: backend.teacherName,
    studentCount: backend.studentCount,
    activityCount: backend.activityCount,
    averages: backend.averages,
    status: toLower<PerformanceStatus>(backend.status),
    rows: backend.rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      scores: row.scores,
      status: toLower<PerformanceStatus>(row.status),
    })),
  };
}

export async function getTeacherCourseSummary(courseId: string): Promise<CourseResultSummary | undefined> {
  try {
    const backend = await apiFetch<BackendCourseResultSummary>(`/results/courses/${courseId}`);
    return toCourseSummary(backend);
  } catch {
    return undefined;
  }
}

export async function getInstitutionSummary(institutionId: string): Promise<InstitutionResultSummary> {
  const backend = await apiFetch<BackendInstitutionResultSummary>(`/institutions/${institutionId}/results`);
  return {
    institutionId: backend.institutionId,
    institutionName: backend.institutionName,
    averages: backend.averages,
    totalActivities: backend.totalActivities,
    courses: backend.courses.map(toCourseSummary),
  };
}

export async function exportCourseReport(courseId: string): Promise<void> {
  const session = sessionStore.get();
  const response = await fetch(`${API_URL}/results/courses/${courseId}/export`, {
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
  });
  if (!response.ok) throw new Error('No se pudo exportar el reporte');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-desempeno-${courseId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface PeriodComparison {
  courseId: string;
  courseName: string;
  periodA: { range: { from: string; to: string }; averages: AxisScores };
  periodB: { range: { from: string; to: string }; averages: AxisScores };
  delta: AxisScores;
}

export async function compareCoursePeriods(
  courseId: string,
  periodA: { from: string; to: string },
  periodB: { from: string; to: string },
): Promise<PeriodComparison> {
  const params = new URLSearchParams({ fromA: periodA.from, toA: periodA.to, fromB: periodB.from, toB: periodB.to });
  return apiFetch<PeriodComparison>(`/results/courses/${courseId}/compare?${params.toString()}`);
}
