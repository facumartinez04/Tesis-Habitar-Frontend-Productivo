export type ComprehensionAxis = 'literal' | 'inferencial' | 'critico';

export type AttemptPolicy = 'unico' | 'reintentos';

export type ActivityStatus = 'borrador' | 'programada' | 'publicada' | 'cerrada';

/** Actividad diagnóstica de inicio o de cierre del ciclo lectivo. */
export type DiagnosticType = 'inicio' | 'cierre';

export interface Activity {
  id: string;
  code: string;
  name: string;
  courseId: string;
  educationLevel: string;
  axis: ComprehensionAxis;
  /** null cuando la actividad se cerró: el texto se borra al cerrarse. */
  sourceText: string | null;
  availableFrom: string;
  startTime: string;
  /** Fecha de cierre; puede ser otro día que la apertura. */
  endDate: string;
  endTime: string;
  attemptPolicy: AttemptPolicy;
  status: ActivityStatus;
  qrValidUntil: string;
  responsesCount: number;
  diagnosticType: DiagnosticType | null;
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

export interface CourseStudentDevice {
  id: string;
  courseId: string;
  studentName: string;
  normalizedStudentName: string;
  deviceId: string;
  userAgent?: string;
  ipAddress?: string;
  linkedAt: string;
  lastActiveAt: string;
}

export interface PublicCourseInfo {
  course: Course;
  activeActivity: {
    id: string;
    code: string;
    name: string;
    endTime: string;
    endDate?: string;
  } | null;
  /** Próxima actividad programada, si no hay ninguna abierta. */
  upcomingActivity?: { code: string; name: string; availableFrom: string; startTime: string } | null;
  /** Cómo se identifica el alumno en la institución: número de lista (por defecto) o nombre y apellido. */
  studentIdMode?: 'LISTA' | 'NOMBRE';
}

