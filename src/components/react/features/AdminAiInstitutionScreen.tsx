import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { AiCostDetailPanel } from './AiCostDetailPanel';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { ensureAdminSession } from '../../../services/authService';
import { t, useI18n } from '../../../i18n';

export function AdminAiInstitutionScreen() {
  useI18n();
  const id = useQueryParam('id', '');
  const month = useQueryParam('month', '');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureAdminSession().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  return (
    <div>
      <a href="/admin/ia" className="inline-flex items-center gap-1 text-[11.5px] text-text-sec hover:text-text-pri mb-2">
        <Icon name="arrowLeft" size={12} />
        {t('Costos de IA')}
      </a>
      {!id ? (
        <div className="text-sm text-text-sec">{t('No se indicó la institución. Volvé a Costos de IA y elegí una.')}</div>
      ) : (
        ready && <AiCostDetailPanel institutionId={id} scope="admin" showName initialMonth={month || undefined} />
      )}
    </div>
  );
}
