import { persistentAtom } from '@nanostores/persistent';
import type { AttemptPolicy, ComprehensionAxis } from '../types/activity';
import type { Question } from '../types/question';

export interface ActivityWizardState {
  educationLevel: string;
  axis: ComprehensionAxis;
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
  sourceText: '',
  wordCount: 0,
  questions: [],
  courseId: '',
  courseName: '',
  availableFrom: '2026-06-18',
  startTime: '08:00',
  endTime: '12:00',
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
  activityWizardStore.set(initialWizardState);
}
