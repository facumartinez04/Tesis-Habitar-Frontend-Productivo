import type { ComprehensionAxis } from '../types/activity';
import type { AlertSeverity, PerformanceAlert } from '../types/alert';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendAlert {
  id: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  axis: string;
  currentValue: number;
  threshold: number;
  severity: string;
  detectedAt: string;
  message: string;
}

export async function getPerformanceAlerts(institutionId: string): Promise<PerformanceAlert[]> {
  const alerts = await apiFetch<BackendAlert[]>(`/institutions/${institutionId}/alerts`);
  return alerts.map((alert) => ({
    id: alert.id,
    courseId: alert.courseId,
    courseName: alert.courseName,
    teacherName: alert.teacherName,
    axis: toLower<ComprehensionAxis>(alert.axis),
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    severity: toLower<AlertSeverity>(alert.severity),
    detectedAt: alert.detectedAt,
    message: alert.message,
  }));
}
