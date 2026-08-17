import type { ComprehensionAxis } from './activity';

export interface Question {
  id: string;
  axis: ComprehensionAxis;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  correctOption?: string;
  edited: boolean;
  approved: boolean;
}
