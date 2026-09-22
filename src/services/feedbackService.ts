import { apiFetch } from '../lib/apiClient';

export interface Feedback {
  id: string;
  studentId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

interface BackendFeedback {
  id: string;
  studentId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export async function listFeedback(studentId: string): Promise<Feedback[]> {
  const backend = await apiFetch<BackendFeedback[]>(`/feedback/students/${studentId}`);
  return backend.map((f) => ({ ...f, createdAt: f.createdAt.slice(0, 10) }));
}

export async function createFeedback(studentId: string, message: string): Promise<Feedback> {
  const backend = await apiFetch<BackendFeedback>(`/feedback/students/${studentId}`, {
    method: 'POST',
    body: { message },
  });
  return { ...backend, createdAt: backend.createdAt.slice(0, 10) };
}
