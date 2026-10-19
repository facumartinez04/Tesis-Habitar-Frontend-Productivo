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
  availableFrom: todayInArgentina(),
  startTime: '08:00',
  endTime: '12:00',
  attemptPolicy: 'unico',
  name: '',
  generatedCode: null,
};

/** Fecha de hoy en hora argentina, en el formato del campo de fecha (AAAA-MM-DD). */
export function todayInArgentina(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

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
  activityWizardStore.set({ ...initialWizardState, availableFrom: todayInArgentina() });
}
