import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';
import { Icon } from '../ui/Icon';
import { Timeline } from '../ui/Timeline';
import { Toast } from '../ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { ensureAdminSession } from '../../../services/authService';
import { getInstitutionBySlug } from '../../../services/institutionService';
import { getOAuthIntegration, resendInvitation, verifyIntegration } from '../../../services/oauthService';
import type { Institution } from '../../../types/institution';
import type { OAuthIntegration } from '../../../types/oauth';

export function OAuthConfigScreen() {
  const institutionSlug = useQueryParam('slug', 'belgrano-norte');
  const { message, showToast } = useToast();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [integration, setIntegration] = useState<OAuthIntegration | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    ensureAdminSession()
      .then(() => getInstitutionBySlug(institutionSlug))
      .then((foundInstitution) => {
        setInstitution(foundInstitution);
        return getOAuthIntegration(foundInstitution.id);
      })
      .then((result) => setIntegration(result ?? null));
  }, [institutionSlug]);

  async function handleVerify() {
    if (!institution) return;
    setVerifying(true);
    const result = await verifyIntegration(institution.id);
    setIntegration(result ?? null);
    setVerifying(false);
    const allDone = result?.steps.every((step) => step.state === 'done');
    showToast(allDone ? 'Integración activada' : 'Paso confirmado, avanzando al siguiente');
  }

  async function handleResend() {
    if (!institution) return;
    setResending(true);
    await resendInvitation(institution.id);
    setResending(false);
    showToast('Enlace reenviado al coordinador/a');
  }

  if (!integration || !institution) return <div className="text-xs text-text-ter">Cargando…</div>;

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">
        Configurar OAuth — {institution.name}
      </div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        Integrá el proveedor de identidad para habilitar el inicio de sesión
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-[18px]">
        <Card className={`flex-1 ${integration.provider === 'google' ? 'border-green-dark border-2' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            <GoogleIcon size={22} />
            <div>
              <div className="text-[13px] font-medium">Google Workspace</div>
              <div className="text-[10.5px] text-green-mid">{integration.provider === 'google' ? 'Seleccionado' : ''}</div>
            </div>
          </div>
        </Card>
        <Card className={`flex-1 ${integration.provider === 'microsoft' ? 'border-green-dark border-2' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            <MicrosoftIcon size={22} />
            <div>
              <div className="text-[13px] font-medium">Microsoft 365</div>
              <div className="text-[10.5px] text-text-ter">{integration.provider === 'microsoft' ? 'Seleccionado' : 'Disponible'}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="form-group mb-4">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Client ID generado para este tenant</label>
        <div className="flex gap-1.5">
          <input readOnly value={integration.clientId} className="flex-1 px-2.5 py-[7px] border border-gray-border rounded-[6px] text-xs font-mono" />
          <button
            onClick={() => { navigator.clipboard.writeText(integration.clientId); showToast('Copiado al portapapeles'); }}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-3 py-1.5 text-xs"
          >
            <Icon name="copy" size={13} />
            Copiar
          </button>
        </div>
      </div>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">Pasos para el/la coordinador/a</div>
        <Timeline items={integration.steps} />
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
        <button onClick={handleResend} disabled={resending} className="bg-white border border-gray-border rounded-[6px] px-3.5 py-2 text-[12.5px] disabled:opacity-50">
          {resending ? 'Reenviando…' : 'Reenviar enlace'}
        </button>
        <button
          onClick={handleVerify}
          disabled={verifying || integration.steps.every((s) => s.state === 'done')}
          className="bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {verifying ? 'Verificando…' : integration.steps.every((s) => s.state === 'done') ? 'Integración activa' : 'Verificar integración'}
        </button>
      </div>
    </div>
  );
}
