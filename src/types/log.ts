export type LogKind = 'eventos' | 'errores' | 'auditoria';

export type LogScope = 'global' | 'institucion';

export type EventCategory = 'ACCESO' | 'SEGURIDAD' | 'USUARIOS' | 'CONFIGURACION' | 'ACTIVIDADES' | 'DATOS' | 'COMERCIAL';

export interface EventLogEntry {
  id: string;
  createdAt: string;
  institutionId: string | null;
  institutionName: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  role: string | null;
  impersonated: boolean;
  category: EventCategory;
  type: string;
  entityId: string | null;
  description: string;
}

export interface ErrorLogEntry {
  id: string;
  createdAt: string;
  source: 'API' | 'PROCESO';
  institutionId: string | null;
  institutionName: string | null;
  userId: string | null;
  userEmail: string | null;
  role: string | null;
  method: string | null;
  path: string | null;
  status: number;
  message: string;
  stack: string | null;
}

export interface AuditLogEntry {
  id: string;
  date: string;
  institutionId: string | null;
  institutionName: string | null;
  studentName: string;
  operation: 'EXPORTACION' | 'ELIMINACION' | 'CONSENTIMIENTO';
  performedBy: string;
}

export interface LogFilters {
  q: string;
  from: string;
  to: string;
  type: string;
  institutionId: string;
}

export interface LogTypeOption {
  value: string;
  label: string;
}

export const LOG_KINDS: { id: LogKind; label: string; description: string }[] = [
  { id: 'eventos', label: 'Eventos', description: 'Accesos, cambios de usuarios y configuración, actividades y acciones de seguridad.' },
  { id: 'auditoria', label: 'Auditoría', description: 'Operaciones sobre datos personales de alumnos: exportación, eliminación y consentimiento.' },
  { id: 'errores', label: 'Errores', description: 'Fallas internas del sistema registradas por la API.' },
];

export const LOG_TYPE_OPTIONS: Record<LogKind, LogTypeOption[]> = {
  eventos: [
    { value: 'ACCESO', label: 'Acceso' },
    { value: 'SEGURIDAD', label: 'Seguridad' },
    { value: 'USUARIOS', label: 'Usuarios' },
    { value: 'CONFIGURACION', label: 'Configuración' },
    { value: 'ACTIVIDADES', label: 'Actividades y cursos' },
    { value: 'DATOS', label: 'Datos' },
    { value: 'COMERCIAL', label: 'Comercial' },
  ],
  auditoria: [
    { value: 'EXPORTACION', label: 'Exportación' },
    { value: 'ELIMINACION', label: 'Eliminación' },
    { value: 'CONSENTIMIENTO', label: 'Consentimiento' },
  ],
  errores: [
    { value: 'API', label: 'API' },
    { value: 'PROCESO', label: 'Proceso del servidor' },
  ],
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Inicio de sesión rechazado',
  LOGOUT: 'Cierre de sesión',
  IMPERSONACION: 'Impersonación',
  ACCESO_DENEGADO: 'Acceso denegado',
  USUARIO_INVITADO: 'Usuario invitado',
  ROL_USUARIO_MODIFICADO: 'Rol de usuario modificado',
  USUARIO_ACTIVADO: 'Usuario activado',
  USUARIO_DESACTIVADO: 'Usuario desactivado',
  ROL_CREADO: 'Rol creado',
  ROL_MODIFICADO: 'Rol modificado',
  ROL_ELIMINADO: 'Rol eliminado',
  OAUTH_HABILITADO: 'OAuth habilitado',
  OAUTH_DESHABILITADO: 'OAuth deshabilitado',
  TOKEN_API_CREADO: 'Token de API creado',
  TOKEN_API_REVOCADO: 'Token de API revocado',
  INSTITUCION_CREADA: 'Institución creada',
  CONFIGURACION_INSTITUCION: 'Configuración modificada',
  ESTADO_INSTITUCION: 'Estado de institución',
  POLITICA_RETENCION: 'Política de retención',
  PRESUPUESTO_IA: 'Presupuesto de IA',
  CONFIGURACION_COBROS: 'Configuración de cobros',
  ACTIVIDAD_CREADA: 'Actividad creada',
  ACTIVIDAD_PUBLICADA: 'Actividad publicada',
  ACTIVIDAD_CERRADA: 'Actividad cerrada',
  PREGUNTAS_LIBERADAS: 'Preguntas liberadas',
  ACTIVIDAD_DUPLICADA: 'Actividad duplicada',
  PREGUNTA_EDITADA: 'Pregunta editada',
  CURSO_CREADO: 'Curso creado',
  DOCENTES_ASIGNADOS: 'Docentes asignados',
  DISPOSITIVO_DESVINCULADO: 'Dispositivo desvinculado',
  PURGA_DATOS: 'Purga por retención',
  BORRADO_ADMIN: 'Borrado definitivo',
  SUSCRIPCION_RENOVADA: 'Suscripción renovada',
  SUSCRIPCION_MODIFICADA: 'Suscripción modificada',
  PLAN_CREADO: 'Plan creado',
  PLAN_MODIFICADO: 'Plan modificado',
  PLAN_ELIMINADO: 'Plan eliminado',
  CUOTA_ESTADO: 'Estado de cuota',
};

export const ROLE_LABEL: Record<string, string> = {
  DOCENTE: 'Docente',
  COORDINADOR: 'Coordinador',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};
