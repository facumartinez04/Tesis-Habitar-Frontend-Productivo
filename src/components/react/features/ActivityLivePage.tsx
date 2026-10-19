import { Icon } from '../ui/Icon';
import { ActivityLivePanel } from './ActivityLivePanel';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useQueryParam } from '../../../hooks/useQueryParam';

/** Página /docente/actividades/vivo?id=…: el panel en vivo de cualquier actividad del docente. */
export function ActivityLivePage() {
  const session = useAuthGuard(['docente', 'coordinador']);
  const activityId = useQueryParam('id', '');
  if (!session) return null;
  if (!activityId) {
    return <div className="text-sm text-text-sec">Falta indicar la actividad.</div>;
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
        Volver
      </a>
      <ActivityLivePanel activityId={activityId} />
    </div>
  );
}
