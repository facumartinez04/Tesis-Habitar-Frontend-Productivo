import type { Course, CourseStudentDevice, CreateCourseInput, PublicCourseInfo } from '../types/activity';
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

export async function getPublicCourseInfo(qrCode: string): Promise<PublicCourseInfo> {
  return apiFetch<PublicCourseInfo>(`/courses/public-info/${encodeURIComponent(qrCode)}`);
}

export async function bindStudentDevice(
  courseId: string,
  studentName: string,
  deviceId: string
): Promise<{ success: boolean; message: string; studentName: string; deviceId: string; locked: boolean }> {
  return apiFetch<{ success: boolean; message: string; studentName: string; deviceId: string; locked: boolean }>(
    `/courses/${courseId}/student-devices/bind`,
    {
      method: 'POST',
      body: { studentName, deviceId },
    }
  );
}

export async function listCourseStudentDevices(courseId: string): Promise<CourseStudentDevice[]> {
  return apiFetch<CourseStudentDevice[]>(`/courses/${courseId}/student-devices`);
}

export async function unlinkCourseStudentDevice(
  courseId: string,
  deviceRecordId: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/courses/${courseId}/student-devices/${deviceRecordId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  return apiFetch<Course>('/courses', {
    method: 'POST',
    body: input,
  });
}

export async function assignCourseTeacher(courseId: string, teacherId: string): Promise<Course> {
  return apiFetch<Course>(`/courses/${courseId}/teacher`, {
    method: 'PATCH',
    body: { teacherId },
  });
}

export async function setTeacherCourses(teacherId: string, courseIds: string[]): Promise<Course[]> {
  return apiFetch<Course[]>(`/courses/teachers/${teacherId}/assignments`, {
    method: 'PUT',
    body: { courseIds },
  });
}

export async function getTeacherCourses(teacherId: string): Promise<Course[]> {
  return apiFetch<Course[]>(`/courses/teachers/${teacherId}/assignments`);
}


