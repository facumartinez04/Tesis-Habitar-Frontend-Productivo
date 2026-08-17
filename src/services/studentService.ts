import type { PerformanceStatus } from '../types/result';
import type { StudentDetail } from '../types/student';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendStudentDetail {
  studentId: string;
  name: string;
  initials: string;
  courseId: string;
  courseName: string;
  activitiesAnswered: number;
  status: string;
  trend: { label: string; literal: number; inferencial: number; critico: number }[];
  history: { activityName: string; date: string; scores: { literal: number; inferencial: number; critico: number } }[];
}

export async function getStudentDetail(id: string): Promise<StudentDetail | undefined> {
  try {
    const backend = await apiFetch<BackendStudentDetail>(`/results/students/${id}`);
    return {
      id: backend.studentId,
      name: backend.name,
      initials: backend.initials,
      courseId: backend.courseId,
      courseName: backend.courseName,
      activitiesAnswered: backend.activitiesAnswered,
      status: toLower<PerformanceStatus>(backend.status),
      trend: backend.trend.map((point) => ({
        month: point.label,
        literal: point.literal,
        inferencial: point.inferencial,
        critico: point.critico,
      })),
      history: backend.history,
    };
  } catch {
    return undefined;
  }
}
