import { persistentAtom } from '@nanostores/persistent';
import type { AttemptPolicy, ComprehensionAxis, DiagnosticType } from '../types/activity';
import type { Question } from '../types/question';
import type { ReadingMode } from '../services/activityService';
import { clearWizardDocument } from '../lib/wizardDocument';

export interface ActivityWizardState {
  educationLevel: string;
  axis: ComprehensionAxis;
  /** Eje foco para generar las preguntas; null = mezcla estándar (1 literal, 3 inferenciales, 1 crítica). */
  focusAxis: ComprehensionAxis | null;
  /** Actividad diagnóstica de inicio o de cierre del ciclo, o actividad común (null). */
  diagnosticType: DiagnosticType | null;
  sourceText: string;
  wordCount: number;
  questions: Question[];
  courseId: string;
  courseName: string;
  availableFrom: string;
  startTime: string;
  /** Fecha de cierre: puede ser otro día (por ejemplo, abre a las 22:00 y cierra al día siguiente). */
  endDate: string;
  endTime: string;
  attemptPolicy: AttemptPolicy;
  /** Cómo empieza el alumno: primero lee (por defecto), espera que el docente habilite las preguntas, o todo junto. */
  readingMode?: ReadingMode;
  /** Ayuda de la IA con el texto para los alumnos. */
  readingHelp?: boolean;
  /** Nombre del PDF o Word original que van a leer los alumnos (el archivo queda en el navegador hasta crearla). */
  documentName?: string | null;
  /** Actividad del banco de la que sale esta (su documento lo copia el servidor). */
  templateId?: string | null;
  /** Al cerrarse, el alumno ve sus respuestas corregidas. */
  showFeedback?: boolean;
  /** Guardar la actividad en el banco de la institución al crearla. */
  saveToBank?: boolean;
  name: string;
  generatedCode: string | null;
  /** Id de la actividad creada: el panel en vivo la sigue por WebSocket. */
  generatedActivityId?: string | null;
}

/** Fecha de hoy en hora argentina, en el formato del campo de fecha (AAAA-MM-DD). */
export function todayInArgentina(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

/** Hora actual en hora argentina (HH:mm). */
export function currentTimeInArgentina(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Ventana por defecto: arranca ahora (redondeado a 5 minutos) y dura 4 horas, aunque eso la lleve al día
 * siguiente, para que la actividad nunca nazca cerrada ni con horario vencido.
 */
export function defaultActivityWindow(): { availableFrom: string; startTime: string; endDate: string; endTime: string } {
  const step = 5 * 60 * 1000;
  const start = new Date(Math.ceil(Date.now() / step) * step);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const part = (d: Date) => ({
    date: d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }),
    time: new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d),
  });
  const a = part(start);
  const b = part(end);
  return { availableFrom: a.date, startTime: a.time, endDate: b.date, endTime: b.time };
}

export const initialWizardState: ActivityWizardState = {
  educationLevel: 'Secundario — 4°',
  axis: 'inferencial',
  focusAxis: null,
  diagnosticType: null,
  sourceText: '',
  wordCount: 0,
  questions: [],
  courseId: '',
  courseName: '',
  ...defaultActivityWindow(),
  attemptPolicy: 'unico',
  readingMode: 'LECTURA_PRIMERO',
  readingHelp: true,
  name: '',
  generatedCode: null,
  generatedActivityId: null,
};

export const activityWizardStore = persistentAtom<ActivityWizardState>(
  'habitar-activity-wizard',
  initialWizardState,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export function updateWizard(patch: Partial<ActivityWizardState>): void {
  activityWizardStore.set({ ...activityWizardStore.get(), ...patch });
}

export function resetWizard(): void {
  activityWizardStore.set({ ...initialWizardState, ...defaultActivityWindow() });
  void clearWizardDocument();
}
