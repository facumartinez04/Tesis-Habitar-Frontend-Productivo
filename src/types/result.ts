export interface AxisScores {
  literal: number | null;
  inferencial: number | null;
  critico: number | null;
}

export type PerformanceStatus = 'bien' | 'regular' | 'bajo' | 'sin_datos';

export interface StudentResultRow {
  studentId: string;
  studentName: string;
  scores: AxisScores | null;
  status: PerformanceStatus;
  criticoPending: boolean;
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
  pendingReviews: number;
}

export interface InstitutionResultSummary {
  institutionId: string;
  institutionName: string;
  averages: AxisScores;
  totalActivities: number;
  courses: CourseResultSummary[];
}

export interface DiagnosticStudentRow {
  studentId: string;
  studentName: string;
  inicio: AxisScores | null;
  cierre: AxisScores | null;
  delta: AxisScores | null;
}

export interface DiagnosticComparison {
  courseId: string;
  courseName: string;
  inicio: { activityId: string; name: string; date: string } | null;
  cierre: { activityId: string; name: string; date: string } | null;
  course: { inicio: AxisScores; cierre: AxisScores; delta: AxisScores } | null;
  students: DiagnosticStudentRow[];
  incomplete: DiagnosticStudentRow[];
}

export interface AxisRecommendation {
  courseId: string;
  threshold: number;
  averages: AxisScores;
  focusAxis: 'LITERAL' | 'INFERENCIAL' | 'CRITICO' | null;
  message: string;
}

export interface UsageMetrics {
  weeklyActiveTeachers: { weekStart: string; teachers: number }[];
  activeTeachersLast30: number;
  activitiesLast30: number;
  activitiesPerActiveTeacherLast30: number | null;
  completionRate: number | null;
  questionsApprovedUnedited: number | null;
  questionsApproved: number;
  aiGradesConfirmed: number | null;
  aiGradesReviewed: number;
  aiCallsLast30: { generation: number; grading: number; failed: number };
  aiCallsPerActivityLast30: number | null;
}
