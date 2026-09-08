import type { Course, CreateCourseInput } from '../types/activity';
import { apiFetch } from '../lib/apiClient';

export async function listMyCourses(): Promise<Course[]> {
  return apiFetch<Course[]>('/courses');
}

export async function getCourseById(id: string): Promise<Course> {
  return apiFetch<Course>(`/courses/${id}`);
}

export async function getCourseByQrCode(qrCode: string): Promise<Course> {
  return apiFetch<Course>(`/courses/by-qr/${encodeURIComponent(qrCode)}`);
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  return apiFetch<Course>('/courses', {
    method: 'POST',
    body: input,
  });
}
