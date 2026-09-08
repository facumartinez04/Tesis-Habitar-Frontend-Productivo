export type ComprehensionAxis = 'literal' | 'inferencial' | 'critico';

export type AttemptPolicy = 'unico' | 'reintentos';

export type ActivityStatus = 'borrador' | 'publicada' | 'cerrada';

export interface Activity {
  id: string;
  code: string;
  name: string;
  courseId: string;
  educationLevel: string;
  axis: ComprehensionAxis;
  sourceText: string;
  availableFrom: string;
  startTime: string;
  endTime: string;
  attemptPolicy: AttemptPolicy;
  status: ActivityStatus;
  qrValidUntil: string;
  responsesCount: number;
}

export interface Course {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  qrCode?: string;
  room?: string;
  grade?: string;
  division?: string;
  shift?: string;
  activeActivityId?: string | null;
  institutionName?: string;
  teacherName?: string;
  studentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCourseInput {
  name: string;
  subject: string;
  grade?: string;
  division?: string;
  room?: string;
  shift?: 'MAÑANA' | 'TARDE' | 'NOCHE';
  teacherId?: string;
}
