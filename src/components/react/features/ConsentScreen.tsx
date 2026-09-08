import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { acceptConsent, getConsentDocument } from '../../../services/complianceService';
import type { ConsentDocument } from '../../../types/compliance';

export function ConsentScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const [document_, setDocument] = useState<ConsentDocument | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    getConsentDocument().then(setDocument);
  }, []);

  async function handleSubmit() {
    if (!session) return;
    setSubmitting(true);
    await acceptConsent();
    setSubmitting(false);
    setConfirmed(true);
  }

  if (!session || !document_) {
    return (
      <div className="bg-surface p-8 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-[560px] space-y-4">
          <div className="flex flex-col items-center space-y-2 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="bg-white border border-gray-border rounded-xl p-5 space-y-3 shadow-xs">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <div className="pt-2 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="bg-surface p-8 min-h-screen flex flex-col items-center justify-center text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-green-bg flex items-center justify-center mb-3">
          <Icon name="check" size={24} className="text-green-mid" />
        </div>
        <div className="text-lg font-semibold mb-1.5">Aceptación registrada</div>
        <div className="text-xs text-text-sec max-w-[320px]">
          {session.user.name} aceptó los términos en nombre de la institución. Habitar quedó habilitado.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface p-8 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[560px]">
        <div className="text-center mb-[22px]">
          <div className="flex justify-center mb-2.5">
            <Icon name="lock" size={40} className="text-green-dark" />
          </div>
          <div className="text-lg font-semibold text-text-pri mb-1">Términos de tratamiento de datos</div>
          <div className="text-[12.5px] text-text-sec">
            Para habilitar Habitar, el/la coordinador/a debe aceptar estos términos en nombre de la institución
          </div>
        </div>

        <Card className="mb-3.5">
          <div className="text-[11.5px] font-medium text-text-sec mb-2.5">Roles de tratamiento (Ley 25.326)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Card surface>
              <div className="text-[10.5px] text-text-ter mb-[3px]">Responsable del tratamiento</div>
              <div className="text-[13px] font-medium">{document_.dataController}</div>
            </Card>
            <Card surface>
              <div className="text-[10.5px] text-text-ter mb-[3px]">Encargado del tratamiento</div>
              <div className="text-[13px] font-medium">{document_.dataProcessor}</div>
            </Card>
          </div>
        </Card>

        <div className="max-h-[120px] overflow-y-auto bg-surface rounded-[6px] px-3.5 py-3 border border-gray-border text-xs leading-relaxed text-text-sec mb-3.5">
          <strong>1. Datos tratados:</strong> respuestas a actividades de comprensión lectora y métricas derivadas, identificadas por nombre o número de lista.
          <br /><br />
          <strong>2. Finalidad:</strong> analítica pedagógica institucional. Sin uso para publicidad ni cesión a terceros.
          <br /><br />
          <strong>3. Minimización:</strong> Habitar no almacena los textos fuente enviados al motor de IA.
          <br /><br />
          <strong>4. Derechos ARCO:</strong> el Responsable puede ejercerlos en cualquier momento desde la sección Datos personales.
          <br /><br />
          <strong>5. Versión del documento:</strong> {document_.version} · {document_.publishedAt}
        </div>

        <label className="flex items-start gap-2.5 my-3.5 cursor-pointer">
          <span
            onClick={() => setAccepted((prev) => !prev)}
            className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 mt-0.5 ${
              accepted ? 'bg-green-dark border-green-dark' : 'border-gray-border'
            }`}
          >
            {accepted && <Icon name="check" size={10} className="text-white" />}
          </span>
          <span className="text-[12.5px]">
            He leído y acepto los términos de tratamiento de datos personales en nombre de la institución. Entiendo que este registro quedará auditado.
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!accepted || submitting}
          className="w-full bg-green-dark text-white py-2.5 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {submitting ? 'Registrando…' : 'Registrar aceptación y habilitar plataforma'}
        </button>
      </div>
    </div>
  );
}
