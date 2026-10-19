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
  /** Cómo se identifica el alumno: número de lista (por defecto) o nombre y apellido. */
  studentIdMode: 'lista' | 'nombre';
  /** Umbral de 0 a 100 debajo del cual un curso genera una alerta (CU-03-03). */
  alertThreshold: number;
  alertEmailsEnabled: boolean;
  createdAt: string;
}

