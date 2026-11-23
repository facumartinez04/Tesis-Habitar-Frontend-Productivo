import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { ensureAdminSession } from '../../../services/authService';
import { getInstitutionBySlug } from '../../../services/institutionService';
import { activateOAuthAccess, deactivateOAuthAccess, getOAuthAccessStatus, setMicrosoftTenant } from '../../../services/oauthService';
import { confirmAction, showError } from '../../../lib/alerts';
import type { Institution } from '../../../types/institution';
import type { OAuthAccessStatus } from '../../../types/oauth';
import { t, useI18n } from '../../../i18n';

const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OAuthConfigScreen() {
  useI18n();
  const institutionSlug = useQueryParam('slug', '');
  const { message, showToast } = useToast();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [status, setStatus] = useState<OAuthAccessStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tenantInput, setTenantInput] = useState('');
  const [savingTenant, setSavingTenant] = useState(false);

  useEffect(() => {
    setTenantInput(status?.microsoftTenantId ?? '');
  }, [status?.microsoftTenantId]);

  useEffect(() => {
    if (!institutionSlug) return;
    setNotFound(false);
    ensureAdminSession()
      .then(() => getInstitutionBySlug(institutionSlug))
      .then((foundInstitution) => {
        setInstitution(foundInstitution);
        return getOAuthAccessStatus(foundInstitution.id);
      })
      .then(setStatus)
      .catch(() => setNotFound(true));
  }, [institutionSlug]);

  async function handleToggle() {
    if (!institution || !status) return;
    const activating = status.institutionStatus !== 'activo';
    const confirmed = await confirmAction({
      title: activating ? t('¿Activar el acceso?') : t('¿Desactivar el acceso?'),
      text: activating
        ? t('Los emails con dominio {domain} van a poder iniciar sesión de inmediato.', { domain: institution.domain })
        : t('Los usuarios con dominio {domain} no van a poder iniciar sesión hasta que lo reactives.', { domain: institution.domain }),
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const updated = activating ? await activateOAuthAccess(institution.id) : await deactivateOAuthAccess(institution.id);
      setStatus(updated);
      showToast(activating ? t('Acceso activado') : t('Acceso desactivado'));
    } catch (err) {
      await showError(t('No se pudo actualizar el estado'), err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  async function saveTenant(value: string | null) {
    if (!institution) return;
    const tenantId = value?.trim() || null;
    if (tenantId && !TENANT_ID.test(tenantId)) {
      await showError(t('El ID de organización de Microsoft no es válido'), t('Tiene el formato 00000000-0000-0000-0000-000000000000.'));
      return;
    }
    if (!tenantId) {
      const confirmed = await confirmAction({
        title: t('¿Quitar la organización de Microsoft?'),
        text: t('Nadie de {domain} va a poder ingresar con Microsoft 365 hasta que la vuelvas a cargar.', { domain: institution.domain }),
      });
      if (!confirmed) return;
    }
    setSavingTenant(true);
    try {
      setStatus(await setMicrosoftTenant(institution.id, tenantId));
      showToast(tenantId ? t('Organización de Microsoft guardada') : t('Organización de Microsoft quitada'));
    } catch (err) {
      await showError(t('No se pudo guardar la organización de Microsoft'), err instanceof Error ? err.message : undefined);
    } finally {
      setSavingTenant(false);
    }
  }

  if (!institutionSlug) {
    return <div className="text-xs text-text-ter">{t('Elegí una institución desde el listado.')}</div>;
  }
  if (notFound) {
    return <div className="text-xs text-red-800">{t('No se encontró la institución "{institutionSlug}".', { institutionSlug })}</div>;
  }
  if (!status || !institution) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const isActive = status.institutionStatus === 'activo';

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">
        {t('Acceso — {name}', { name: institution.name })}
      </div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {t('Habitar usa una única aplicación OAuth por proveedor para toda la plataforma: cualquier cuenta con dominio')}{' '}
        <span className="font-mono">{institution.domain}</span>{' '}{t('puede iniciar sesión mientras la institución esté activa.')}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-[18px]">
        <Card className={`flex-1 ${status.googleConfigured ? 'border-green-dark border-2' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            <GoogleIcon size={22} />
            <div>
              <div className="text-[13px] font-medium">{t('Google Workspace')}</div>
              <Badge color={status.googleConfigured ? 'green' : 'gray'}>
                {status.googleConfigured ? t('Configurado en el servidor') : t('Sin credenciales configuradas')}
              </Badge>
            </div>
          </div>
        </Card>
        <Card className={`flex-1 ${status.microsoftConfigured ? 'border-green-dark border-2' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            <MicrosoftIcon size={22} />
            <div>
              <div className="text-[13px] font-medium">{t('Microsoft 365')}</div>
              <Badge color={status.microsoftConfigured ? 'green' : 'gray'}>
                {status.microsoftConfigured ? t('Configurado en el servidor') : t('Sin credenciales configuradas')}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[12.5px] font-medium mb-1">{t('Estado de la institución')}</div>
            <div className="text-[11.5px] text-text-sec">
              {t('Coordinador/a:')}{' '}<span className="font-medium">{status.coordinatorEmail}</span>
            </div>
          </div>
          <Badge color={isActive ? 'green' : 'amber'}>{isActive ? t('Activa — login habilitado') : t('Piloto no confirmado')}</Badge>
        </div>
      </Card>

      <Card className="mt-2.5">
        <div className="flex items-center gap-2 mb-1">
          <MicrosoftIcon size={16} />
          <div className="text-[12.5px] font-medium">{t('Organización de Microsoft 365')}</div>
          <Badge color={status.microsoftTenantId ? 'green' : 'gray'}>
            {status.microsoftTenantId ? t('Vinculada') : t('Sin vincular')}
          </Badge>
        </div>
        <div className="text-[11.5px] text-text-sec mb-2.5">
          {t('Para ingresar con Microsoft 365, la cuenta tiene que pertenecer a la organización de la escuela. Cargá el ID de inquilino (tenant ID): lo ve el administrador de la escuela en Microsoft Entra › Información general, y también queda en la bitácora de eventos cuando alguien de esa organización intenta ingresar.')}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={tenantInput}
            onChange={(e) => setTenantInput(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            spellCheck={false}
            aria-label={t('ID de inquilino de Microsoft')}
            className="flex-1 min-w-0 font-mono text-[12px] px-3 py-2 rounded-[6px] border border-gray-border bg-white dark:bg-transparent"
          />
          <button
            onClick={() => saveTenant(tenantInput)}
            disabled={savingTenant || !tenantInput.trim() || tenantInput.trim().toLowerCase() === status.microsoftTenantId}
            className="px-4 py-2 rounded-[6px] text-[12.5px] font-medium bg-green-dark text-white disabled:opacity-50"
          >
            {savingTenant ? t('Guardando…') : t('Guardar')}
          </button>
          {status.microsoftTenantId && (
            <button
              onClick={() => saveTenant(null)}
              disabled={savingTenant}
              className="px-4 py-2 rounded-[6px] text-[12.5px] font-medium bg-white border border-gray-border text-red-800 disabled:opacity-50"
            >
              {t('Quitar')}
            </button>
          )}
        </div>
      </Card>

      {!status.googleConfigured && !status.microsoftConfigured && (
        <div className="bg-red-100 text-red-800 rounded-[6px] px-3.5 py-2.5 mt-4 text-[12.5px] flex items-center gap-2">
          <Icon name="alertTriangle" size={15} />
          {t('El servidor no tiene configurado ningún proveedor OAuth (variables de entorno GOOGLE_CLIENT_ID/SECRET o MICROSOFT_CLIENT_ID/SECRET). Nadie va a poder iniciar sesión hasta configurarlas.')}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50 ${
            isActive ? 'bg-white border border-gray-border text-red-800' : 'bg-green-dark text-white'
          }`}
        >
          {loading ? t('Guardando…') : isActive ? t('Desactivar acceso') : t('Activar acceso')}
        </button>
      </div>
    </div>
  );
}
