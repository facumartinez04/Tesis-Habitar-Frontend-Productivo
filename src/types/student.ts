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

export interface StudentHelpActivity {
  activityId: string;
  activityName: string;
  questions: { question: string; answer: string; declined: boolean; askedAt: string }[];
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
  helpQuestions: StudentHelpActivity[];
}
