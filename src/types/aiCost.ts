export type AiUsageKind = 'GENERACION' | 'CORRECCION' | 'AYUDA';

export type AiKeySource = 'PLATAFORMA' | 'PROPIA';

export interface AiCostKindSummary {
  kind: AiUsageKind;
  calls: number;
  failed: number;
  tokens: number;
  platformCostUsd: number;
  ownCostUsd: number;
  sharePct: number;
}

export interface AiCostModelSummary {
  provider: string;
  model: string;
  keySource: AiKeySource;
  calls: number;
  tokens: number;
  costUsd: number;
}

export interface AiCostMonthRow {
  month: string;
  platformCostUsd: number;
  ownCostUsd: number;
  calls: number;
}

export interface InstitutionAiCostDetail {
  institution: {
    institutionId: string;
    name: string;
    keySource: string;
    provider: string;
    budgetUsd: number | null;
  };
  month: string;
  currentMonth: string;
  totals: {
    calls: number;
    failed: number;
    promptTokens: number;
    completionTokens: number;
    platformCostUsd: number;
    ownCostUsd: number;
  };
  budgetUsedPct: number | null;
  overBudget: boolean;
  byKind: AiCostKindSummary[];
  byModel: AiCostModelSummary[];
  history: AiCostMonthRow[];
}

export const AI_KIND_LABEL: Record<AiUsageKind, { label: string; detail: string }> = {
  GENERACION: { label: 'Generación de preguntas', detail: 'El docente pide preguntas a partir del texto.' },
  CORRECCION: { label: 'Corrección de respuestas críticas', detail: 'Puntaje sugerido que el docente confirma.' },
  AYUDA: { label: 'Ayuda de lectura', detail: 'Consultas de los alumnos sobre palabras y expresiones.' },
};
