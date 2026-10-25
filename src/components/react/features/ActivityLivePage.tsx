import { Icon } from '../ui/Icon';
import { ActivityLivePanel } from './ActivityLivePanel';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { t, useI18n } from '../../../i18n';

export function ActivityLivePage() {
  useI18n();
  const session = useAuthGuard(['docente', 'coordinador']);
  const activityId = useQueryParam('id', '');
  if (!session) return null;
  if (!activityId) {
    return <div className="text-sm text-text-sec">{t('Falta indicar la actividad.')}</div>;
  }
  return (
    <div>
      <a
        href="/docente/cursos"
        onClick={(e) => {
          if (window.history.length > 1) {
            e.preventDefault();
            window.history.back();
          }
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-sec hover:text-text-pri mb-3"
      >
        <Icon name="arrowLeft" size={13} />
        {t('Volver')}
      </a>
      <ActivityLivePanel activityId={activityId} />
    </div>
  );
}
