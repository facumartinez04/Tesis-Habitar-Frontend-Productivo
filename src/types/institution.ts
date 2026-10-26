export type InstitutionStatus = 'activo' | 'piloto_no_confirmado';

export type EducationLevel = 'primario' | 'secundario';

export type ComprehensionAxis = 'literal' | 'inferencial' | 'critico';

export type AiProvider = 'deepseek' | 'openai';

export type AiKeySource = 'platform' | 'custom';

export interface Institution {
  id: string;
  slug: string;
  name: string;
  domain: string;
  levels: EducationLevel[];
  enabledAxes: ComprehensionAxis[];
  status: InstitutionStatus;
  coordinatorEmail: string;
  aiProvider?: AiProvider;
  aiKeySource?: AiKeySource;
  aiCustomApiKeyMasked?: string | null;
  hasCustomApiKey?: boolean;
  aiModel?: string | null;
  studentIdMode: 'lista' | 'nombre';
  alertThreshold: number;
  alertEmailsEnabled: boolean;
  defaultLanguage: 'es' | 'en';
  readingMaxChars: number;
  pausedAt: string | null;
  pauseReason: string | null;
  createdAt: string;
}

