import type { AuditOperation } from '../types/compliance';
import type { ArcoStudentRecord, AuditLogEntry, ConsentAcceptance, ConsentDocument } from '../types/compliance';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendAuditLogEntry {
  id: string;
  studentId: string | null;
  studentName: string;
  operation: string;
  performedBy: string;
  date: string;
}

function toAuditEntry(entry: BackendAuditLogEntry): AuditLogEntry {
  return {
    id: entry.id,
    date: entry.date.slice(0, 10),
    studentName: entry.studentName,
    operation: toLower<AuditOperation>(entry.operation),
    performedBy: entry.performedBy,
  };
}

export async function searchArcoStudents(institutionId: string, query: string): Promise<ArcoStudentRecord[]> {
  const params = new URLSearchParams({ institutionId, q: query });
  return apiFetch<ArcoStudentRecord[]>(`/compliance/students?${params.toString()}`);
}

export async function getAuditLog(institutionId: string): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams({ institutionId });
  const entries = await apiFetch<BackendAuditLogEntry[]>(`/compliance/audit-log?${params.toString()}`);
  return entries.map(toAuditEntry);
}

export async function exportStudentData(institutionId: string, studentId: string): Promise<Blob> {
  const params = new URLSearchParams({ institutionId });
  const record = await apiFetch<ArcoStudentRecord>(`/compliance/students/${studentId}/export?${params.toString()}`, {
    method: 'POST',
  });
  return new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
}

export async function deleteStudentData(institutionId: string, studentId: string): Promise<void> {
  const params = new URLSearchParams({ institutionId });
  await apiFetch<void>(`/compliance/students/${studentId}?${params.toString()}`, { method: 'DELETE' });
}

export async function acceptConsent(): Promise<ConsentAcceptance> {
  return apiFetch<ConsentAcceptance>('/compliance/consent/accept', { method: 'POST' });
}

export async function getConsentDocument(): Promise<ConsentDocument> {
  return apiFetch<ConsentDocument>('/compliance/consent', { auth: false });
}

export interface RetentionPolicy {
  institutionId: string;
  retentionMonths: number;
  lastPurgeAt: string | null;
}

export async function getRetentionPolicy(institutionId: string): Promise<RetentionPolicy> {
  return apiFetch<RetentionPolicy>(`/compliance/retention/${institutionId}`);
}

export async function updateRetentionPolicy(institutionId: string, retentionMonths: number): Promise<RetentionPolicy> {
  return apiFetch<RetentionPolicy>(`/compliance/retention/${institutionId}`, {
    method: 'PATCH',
    body: { retentionMonths },
  });
}

export async function purgeExpiredData(institutionId: string): Promise<{ purgedStudentCount: number; purgedAt: string }> {
  return apiFetch(`/compliance/retention/${institutionId}/purge`, { method: 'POST' });
}
