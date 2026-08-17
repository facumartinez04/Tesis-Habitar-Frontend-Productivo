import type { AxisScores, PerformanceStatus } from './result';

export interface StudentActivityHistoryRow {
  activityName: string;
  date: string;
  scores: AxisScores;
}

export interface StudentTrendPoint {
  month: string;
  literal: number;
  inferencial: number;
  critico: number;
}

export interface StudentDetail {
  id: string;
  name: string;
  initials: string;
  courseId: string;
  courseName: string;
  activitiesAnswered: number;
  status: PerformanceStatus;
  trend: StudentTrendPoint[];
  history: StudentActivityHistoryRow[];
}
