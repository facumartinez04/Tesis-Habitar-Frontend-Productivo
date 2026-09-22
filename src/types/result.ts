export interface AxisScores {
  literal: number;
  inferencial: number;
  critico: number;
}

export type PerformanceStatus = 'bien' | 'regular' | 'bajo' | 'sin_datos';

export interface StudentResultRow {
  studentId: string;
  studentName: string;
  scores: AxisScores | null;
  status: PerformanceStatus;
}

export interface CourseResultSummary {
  courseId: string;
  courseName: string;
  teacherName: string;
  studentCount: number;
  activityCount: number;
  averages: AxisScores;
  status: PerformanceStatus;
  rows: StudentResultRow[];
}

export interface InstitutionResultSummary {
  institutionId: string;
  institutionName: string;
  averages: AxisScores;
  totalActivities: number;
  courses: CourseResultSummary[];
}
