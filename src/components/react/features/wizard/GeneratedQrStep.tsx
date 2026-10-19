import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { Icon } from '../../ui/Icon';
import { QrBox } from '../../ui/QrBox';
import { ActivityLivePanel } from '../ActivityLivePanel';
import { activityWizardStore, resetWizard } from '../../../../store/activityWizardStore';

/** Último paso del asistente: la actividad recién creada, en vivo (QR, estado y respuestas sin recargar). */
export function GeneratedQrStep() {
  const wizard = useStore(activityWizardStore);

  useEffect(() => {
    if (!wizard.generatedCode) window.location.href = '/docente/actividades/nueva';
  }, [wizard.generatedCode]);

  if (!wizard.generatedCode) return null;

  function handleCreateAnother() {
    resetWizard();
    window.location.href = '/docente/actividades/nueva';
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <a href="/docente/cursos" className="inline-flex items-center gap-1.5 font-semibold text-text-sec hover:text-text-pri">
        <Icon name="arrowLeft" size={12} />
        Volver a mis aulas
      </a>
      <button type="button" onClick={handleCreateAnother} className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
        <Icon name="plus" size={12} />
        Crear otra actividad
      </button>
    </div>
  );

  // Las actividades creadas antes de este cambio sólo guardaban el código: se muestra el QR sin el panel en vivo.
  if (!wizard.generatedActivityId) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-lg font-bold text-text-pri">Actividad creada</div>
        <QrBox code={wizard.generatedCode} size="lg" />
        <div className="w-full max-w-md">{footer}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-full px-3 py-1 mb-4">
        <Icon name="check" size={12} />
        Actividad creada. Las respuestas aparecen acá solas, sin recargar.
      </div>
      <ActivityLivePanel activityId={wizard.generatedActivityId} footer={footer} />
    </div>
  );
}
