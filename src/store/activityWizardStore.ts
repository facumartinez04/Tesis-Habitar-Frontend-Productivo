import { persistentAtom } from '@nanostores/persistent';
import type { AttemptPolicy, ComprehensionAxis, DiagnosticType } from '../types/activity';
import type { Question } from '../types/question';
import type { ReadingMode } from '../services/activityService';
import { clearWizardDocument } from '../lib/wizardDocument';
import type { Locale } from '../i18n';
import type { QuestionType } from '../types/question';

export interface ActivityWizardState {
  educationLevel: string;
  axis: ComprehensionAxis;
  focusAxis: ComprehensionAxis | null;
  diagnosticType: DiagnosticType | null;
  sourceText: string;
  wordCount: number;
  questions: Question[];
  courseId: string;
  courseName: string;
  availableFrom: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attemptPolicy: AttemptPolicy;
  readingMode?: ReadingMode;
  readingHelp?: boolean;
  documentName?: string | null;
  /** El texto salió de un archivo o del banco: se limita por el peso del archivo y no por el largo de la institución. */
  fromDocument?: boolean;
  templateId?: string | null;
  showFeedback?: boolean;
  language?: Locale;
  questionTypes?: QuestionType[];
  saveToBank?: boolean;
  name: string;
  generatedCode: string | null;
  generatedActivityId?: string | null;
}

export function todayInArgentina(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export function currentTimeInArgentina(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

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
