import type { ComprehensionAxis } from './activity';

export type QuestionType = 'OPCION_UNICA' | 'OPCION_MULTIPLE' | 'VERDADERO_FALSO' | 'COMPLETAR' | 'ABIERTA';

export const CLOSED_QUESTION_TYPES: QuestionType[] = ['OPCION_UNICA', 'OPCION_MULTIPLE', 'VERDADERO_FALSO', 'COMPLETAR'];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  OPCION_UNICA: 'Opción única',
  OPCION_MULTIPLE: 'Opción múltiple',
  VERDADERO_FALSO: 'Verdadero o falso',
  COMPLETAR: 'Completar',
  ABIERTA: 'Respuesta abierta',
};

export interface Question {
  id: string;
  axis: ComprehensionAxis;
  type?: QuestionType;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  correctOption?: string;
  correctOptions?: string[];
  acceptedAnswers?: string[];
  edited: boolean;
  approved: boolean;
}

export function questionTypeOf(question: Pick<Question, 'type' | 'options' | 'correctOption'>): QuestionType {
  if (question.type) return question.type;
  return question.options && question.options.length > 0 ? 'OPCION_UNICA' : 'ABIERTA';
}
