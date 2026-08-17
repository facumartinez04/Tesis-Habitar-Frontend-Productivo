import type { Course } from '../types/activity';
import { apiFetch } from '../lib/apiClient';

export async function listMyCourses(): Promise<Course[]> {
  return apiFetch<Course[]>('/courses');
}
