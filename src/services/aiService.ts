import type { ComprehensionAxis } from '../types/activity';
import type { Question } from '../types/question';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';

export interface GenerateQuestionsResult {
  questions: Question[];
  wordCount: number;
}

interface BackendGeneratedQuestion {
  axis: string;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  correctOption?: string;
  approved: boolean;
}

interface BackendGenerateQuestionsResponse {
  wordCount: number;
  isValid: boolean;
  questions: BackendGeneratedQuestion[];
}

export async function generateQuestions(sourceText: string, focusAxis?: ComprehensionAxis): Promise<GenerateQuestionsResult> {
  const result = await apiFetch<BackendGenerateQuestionsResponse>('/activities/generate-questions', {
    method: 'POST',
    body: { sourceText, focusAxis: focusAxis ? toUpper(focusAxis) : undefined },
  });

  const questions: Question[] = result.questions.map((question, index) => ({
    id: `draft-${index}`,
    axis: toLower<ComprehensionAxis>(question.axis),
    prompt: question.prompt,
    expectedAnswer: question.expectedAnswer,
    options: question.options,
    correctOption: question.correctOption,
    edited: false,
    approved: question.approved,
  }));

  return { questions, wordCount: result.wordCount };
}

export function validateWordCount(wordCount: number, min = 40, max = 600): boolean {
  return wordCount >= min && wordCount <= max;
}
