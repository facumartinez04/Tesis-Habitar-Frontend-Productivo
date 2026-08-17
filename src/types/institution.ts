export type InstitutionStatus = 'activo' | 'piloto_no_confirmado';

export type EducationLevel = 'primario' | 'secundario';

export type ComprehensionAxis = 'literal' | 'inferencial' | 'critico';

export interface Institution {
  id: string;
  slug: string;
  name: string;
  domain: string;
  levels: EducationLevel[];

  enabledAxes: ComprehensionAxis[];
  status: InstitutionStatus;
  coordinatorEmail: string;
  createdAt: string;
}
