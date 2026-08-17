import type { ComprehensionAxis } from './activity';

export type AlertSeverity = 'critica' | 'advertencia' | 'resuelta';

export interface PerformanceAlert {
  id: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  axis: ComprehensionAxis;
  currentValue: number;
  threshold: number;
  severity: AlertSeverity;
  detectedAt: string;
  message: string;
}
