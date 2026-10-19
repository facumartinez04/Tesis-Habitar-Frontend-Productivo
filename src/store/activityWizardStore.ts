import { persistentAtom } from '@nanostores/persistent';
import type { AttemptPolicy, ComprehensionAxis, DiagnosticType } from '../types/activity';
import type { Question } from '../types/question';

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
  endTime: string;
  attemptPolicy: AttemptPolicy;
  name: string;
  generatedCode: string | null;
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
 * Ventana por defecto: arranca ahora (redondeado a 5 minutos) y dura 4 horas (o hasta 23:59),
 * para que la actividad nunca nazca cerrada ni con horario vencido.
 */
export function defaultActivityWindow(): { availableFrom: string; startTime: string; endTime: string } {
  const today = todayInArgentina();
  const timeStr = currentTimeInArgentina();
  const [hourStr, minStr] = timeStr.split(':');
  let h = parseInt(hourStr ?? '8', 10);
  let m = parseInt(minStr ?? '0', 10);
  m = Math.ceil(m / 5) * 5;
  if (m >= 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const endH = h + 4;
  let endTime: string;
  if (endH >= 24) {
    endTime = '23:59';
  } else {
    endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return { availableFrom: today, startTime, endTime };
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
  name: '',
  generatedCode: null,
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
}
