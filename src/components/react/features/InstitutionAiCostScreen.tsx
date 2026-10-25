import { AiCostDetailPanel } from './AiCostDetailPanel';
import { SkeletonTable } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { t, useI18n } from '../../../i18n';

export function InstitutionAiCostScreen() {
  useI18n();
  const session = useAuthGuard(['coordinador', 'admin']);
  if (!session) return <SkeletonTable />;
  const institutionId = session.impersonatedInstitutionId ?? session.user.institutionId;

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{t('Costo de IA de la institución')}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {t('Cuánto consumió la institución en inteligencia artificial: por tipo de uso, por modelo y mes a mes.')}
      </div>
      <AiCostDetailPanel institutionId={institutionId} scope="institucion" />
    </div>
  );
}
