import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { TableWrap } from '../ui/TableWrap';
import { SkeletonTable } from '../ui/Skeleton';
import { formatTokens, formatUsd, getInstitutionAiCosts, monthLabel, type AiCostScope } from '../../../services/aiCostService';
import { AI_KIND_LABEL, type InstitutionAiCostDetail } from '../../../types/aiCost';
import { t, useI18n, intlLocale } from '../../../i18n';

interface AiCostDetailPanelProps {
  institutionId: string;
  scope: AiCostScope;
  showName?: boolean;
  initialMonth?: string;
}

const th = 'text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white';
const td = 'px-2.5 py-2.5 border-b border-gray-border';
const card = 'bg-card-bg border border-gray-border rounded-xl p-4';
const kpiLabel = 'text-[11px] text-text-ter uppercase tracking-wider font-semibold';
const kpiValue = 'text-2xl font-bold text-text-pri tabular-nums mt-1';

export function AiCostDetailPanel({ institutionId, scope, showName = false, initialMonth }: AiCostDetailPanelProps) {
  useI18n();
  const [data, setData] = useState<InstitutionAiCostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (month?: string) => {
      getInstitutionAiCosts(institutionId, scope, month)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((err: Error) => setError(err.message || t('No se pudo cargar el costo de IA')));
    },
    [institutionId, scope],
  );

  useEffect(() => load(initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : undefined), [load, initialMonth]);

  if (error) return <div className="text-xs text-red">{error}</div>;
  if (!data) return <SkeletonTable />;

  const totalsItem = data.totals;
  const total = totalsItem.platformCostUsd + totalsItem.ownCostUsd;
  const maxHistory = Math.max(...data.history.map((h) => h.platformCostUsd + h.ownCostUsd), 0);
  const ownKey = data.institution.keySource === 'CUSTOM';

  return (
    <div>
      {showName && <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{t('Costo de IA de {name}', { name: data.institution.name })}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={ownKey ? 'blue' : 'gray'}>{ownKey ? t('Usa su propia clave de IA') : t('Usa la clave de la plataforma')}</Badge>
          <Badge color="gray">{t('Proveedor:')}{' '}{data.institution.provider === 'OPENAI' ? 'OpenAI' : 'DeepSeek'}</Badge>
        </div>
        <label className="text-[11px] text-text-sec">
          {t('Mes')}
          <input
            type="month"
            value={data.month}
            max={data.currentMonth}
            onChange={(e) => e.target.value && load(e.target.value)}
            className="block mt-1 px-2.5 py-[6px] border border-gray-border rounded-[6px] text-[12.5px]"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className={card}>
          <div className={kpiLabel}>{t('Gasto con la clave de la plataforma')}</div>
          <div className={kpiValue}>{formatUsd(totalsItem.platformCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            {data.institution.budgetUsd === null ? t('Sin tope mensual') : t('Tope {formatUsd} · {value}% usado', { formatUsd: formatUsd(data.institution.budgetUsd), value: data.budgetUsedPct ?? 0 })}
          </div>
          {data.institution.budgetUsd !== null && (
            <div className="h-1.5 rounded-full bg-gray-bg overflow-hidden mt-2">
              <div
                className={`h-full ${data.overBudget ? 'bg-red-500' : (data.budgetUsedPct ?? 0) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, data.budgetUsedPct ?? 0)}%` }}
              />
            </div>
          )}
        </div>
        <div className={card}>
          <div className={kpiLabel}>{t('Con su propia clave')}</div>
          <div className={kpiValue}>{formatUsd(totalsItem.ownCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">{t('Lo paga la institución a su proveedor')}</div>
        </div>
        <div className={card}>
          <div className={kpiLabel}>{t('Usos de IA')}</div>
          <div className={kpiValue}>{totalsItem.calls.toLocaleString(intlLocale())}</div>
          <div className="text-[11px] text-text-sec mt-1">{t('{failed} con error', { failed: totalsItem.failed })}</div>
        </div>
        <div className={card}>
          <div className={kpiLabel}>{t('Tokens')}</div>
          <div className={kpiValue}>{formatTokens(totalsItem.promptTokens + totalsItem.completionTokens)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            {t('{formatTokens} de entrada · {formatTokens2} de salida', { formatTokens: formatTokens(totalsItem.promptTokens), formatTokens2: formatTokens(totalsItem.completionTokens) })}
          </div>
        </div>
      </div>

      <div className="text-sm font-bold text-text-pri mb-2">{t('Por tipo de uso')}</div>
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>{t('Uso')}</th>
            <th className={th}>{t('Usos')}</th>
            <th className={th}>{t('Tokens')}</th>
            <th className={th}>{t('Costo')}</th>
            <th className={`${th} min-w-[160px]`}>{t('Parte del gasto')}</th>
          </tr>
        </thead>
        <tbody>
          {data.byKind.map((k) => (
            <tr key={k.kind} className="text-[12px]">
              <td className={td}>
                <div className="font-medium text-text-pri">{t(AI_KIND_LABEL[k.kind].label)}</div>
                <div className="text-[11px] text-text-ter">{t(AI_KIND_LABEL[k.kind].detail)}</div>
              </td>
              <td className={`${td} tabular-nums`}>
                {k.calls.toLocaleString(intlLocale())}
                {k.failed > 0 && <div className="text-[10.5px] text-amber-700 dark:text-amber-300">{t('{failed} con error', { failed: k.failed })}</div>}
              </td>
              <td className={`${td} tabular-nums`}>{formatTokens(k.tokens)}</td>
              <td className={`${td} tabular-nums`}>
                <div className="font-semibold">{formatUsd(k.platformCostUsd)}</div>
                {k.ownCostUsd > 0 && <div className="text-[10.5px] text-text-ter">{t('+ {formatUsd} con su clave', { formatUsd: formatUsd(k.ownCostUsd) })}</div>}
              </td>
              <td className={td}>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-bg overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${k.sharePct}%` }} />
                  </div>
                  <span className="text-[11px] text-text-sec tabular-nums w-12 text-right">{k.sharePct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="text-sm font-bold text-text-pri mt-5 mb-2">{t('Por proveedor y modelo')}</div>
      {data.byModel.length === 0 ? (
        <div className="text-[12.5px] text-text-sec border border-dashed border-gray-border rounded-[8px] px-4 py-5 text-center">{t('No hubo usos de IA en {monthLabel}.', { monthLabel: monthLabel(data.month) })}</div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>{t('Proveedor')}</th>
              <th className={th}>{t('Modelo')}</th>
              <th className={th}>{t('Clave')}</th>
              <th className={th}>{t('Usos')}</th>
              <th className={th}>{t('Tokens')}</th>
              <th className={th}>{t('Costo')}</th>
            </tr>
          </thead>
          <tbody>
            {data.byModel.map((m) => (
              <tr key={`${m.provider}-${m.model}-${m.keySource}`} className="text-[12px]">
                <td className={td}>{m.provider === 'OPENAI' ? 'OpenAI' : m.provider === 'DEEPSEEK' ? 'DeepSeek' : m.provider}</td>
                <td className={`${td} font-mono text-[11.5px]`}>{m.model}</td>
                <td className={td}>
                  <Badge color={m.keySource === 'PROPIA' ? 'blue' : 'gray'}>{m.keySource === 'PROPIA' ? t('Propia') : t('Plataforma')}</Badge>
                </td>
                <td className={`${td} tabular-nums`}>{m.calls.toLocaleString(intlLocale())}</td>
                <td className={`${td} tabular-nums`}>{formatTokens(m.tokens)}</td>
                <td className={`${td} tabular-nums font-semibold`}>{formatUsd(m.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <div className={`${card} mt-5`}>
        <div className="text-xs font-bold text-text-pri mb-3">{t('Gasto de IA de la institución, últimos 6 meses')}</div>
        <div className="grid grid-cols-6 gap-2 items-end">
          {data.history.map((h) => {
            const value = h.platformCostUsd + h.ownCostUsd;
            return (
              <button
                key={h.month}
                type="button"
                onClick={() => load(h.month)}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 cursor-pointer ${h.month === data.month ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                title={t('{calls} usos · plataforma {formatUsd} · propia {formatUsd2}', { calls: h.calls, formatUsd: formatUsd(h.platformCostUsd), formatUsd2: formatUsd(h.ownCostUsd) })}
              >
                <span className="text-[10.5px] text-text-sec tabular-nums">{formatUsd(value)}</span>
                <span className="w-full h-16 flex items-end">
                  <span
                    className={`w-full rounded-t ${h.month === data.month ? 'bg-emerald-600' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                    style={{ height: `${maxHistory ? Math.max(4, Math.round((value / maxHistory) * 100)) : 4}%` }}
                  />
                </span>
                <span className="text-[10.5px] text-text-ter capitalize">{monthLabel(h.month)}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-text-ter mt-3">
          {t('Total del mes elegido: {formatUsd}. El costo surge de los tokens que informa el proveedor por el precio de cada modelo.', { formatUsd: formatUsd(total) })}
        </div>
      </div>
    </div>
  );
}
