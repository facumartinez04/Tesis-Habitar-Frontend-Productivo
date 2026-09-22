export type AuditOperation = 'exportacion' | 'eliminacion' | 'consentimiento';

export interface AuditLogEntry {
  id: string;
  date: string;
  studentName: string;
  operation: AuditOperation;
  performedBy: string;
}

export interface ArcoStudentRecord {
  id: string;
  name: string;
  courseName: string;
  activitiesCount: number;
  lastActivityDate: string | null;
}

export interface ConsentDocument {
  version: string;
  publishedAt: string;
  dataController: string;
  dataProcessor: string;
}

export interface ConsentAcceptance {
  institutionId: string;
  acceptedBy: string;
  acceptedAt: string;
  documentVersion: string;
}
