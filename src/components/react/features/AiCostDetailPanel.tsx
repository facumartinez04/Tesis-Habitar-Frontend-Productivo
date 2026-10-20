import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { TableWrap } from '../ui/TableWrap';
import { SkeletonTable } from '../ui/Skeleton';
import { formatTokens, formatUsd, getInstitutionAiCosts, monthLabel, type AiCostScope } from '../../../services/aiCostService';
import { AI_KIND_LABEL, type InstitutionAiCostDetail } from '../../../types/aiCost';

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
  const [data, setData] = useState<InstitutionAiCostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (month?: string) => {
      getInstitutionAiCosts(institutionId, scope, month)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((err: Error) => setError(err.message || 'No se pudo cargar el costo de IA'));
    },
    [institutionId, scope],
  );

  useEffect(() => load(initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : undefined), [load, initialMonth]);

  if (error) return <div className="text-xs text-red">{error}</div>;
  if (!data) return <SkeletonTable />;

  const t = data.totals;
  const total = t.platformCostUsd + t.ownCostUsd;
  const maxHistory = Math.max(...data.history.map((h) => h.platformCostUsd + h.ownCostUsd), 0);
  const ownKey = data.institution.keySource === 'CUSTOM';

  return (
    <div>
      {showName && <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Costo de IA de {data.institution.name}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={ownKey ? 'blue' : 'gray'}>{ownKey ? 'Usa su propia clave de IA' : 'Usa la clave de la plataforma'}</Badge>
          <Badge color="gray">Proveedor: {data.institution.provider === 'OPENAI' ? 'OpenAI' : 'DeepSeek'}</Badge>
        </div>
        <label className="text-[11px] text-text-sec">
          Mes
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
          <div className={kpiLabel}>Gasto con la clave de la plataforma</div>
          <div className={kpiValue}>{formatUsd(t.platformCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            {data.institution.budgetUsd === null ? 'Sin tope mensual' : `Tope ${formatUsd(data.institution.budgetUsd)} · ${data.budgetUsedPct ?? 0}% usado`}
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
          <div className={kpiLabel}>Con su propia clave</div>
          <div className={kpiValue}>{formatUsd(t.ownCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">Lo paga la institución a su proveedor</div>
        </div>
        <div className={card}>
          <div className={kpiLabel}>Usos de IA</div>
          <div className={kpiValue}>{t.calls.toLocaleString('es-AR')}</div>
          <div className="text-[11px] text-text-sec mt-1">{t.failed} con error</div>
        </div>
        <div className={card}>
          <div className={kpiLabel}>Tokens</div>
          <div className={kpiValue}>{formatTokens(t.promptTokens + t.completionTokens)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            {formatTokens(t.promptTokens)} de entrada · {formatTokens(t.completionTokens)} de salida
          </div>
        </div>
      </div>

      <div className="text-sm font-bold text-text-pri mb-2">Por tipo de uso</div>
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Uso</th>
            <th className={th}>Usos</th>
            <th className={th}>Tokens</th>
            <th className={th}>Costo</th>
            <th className={`${th} min-w-[160px]`}>Parte del gasto</th>
          </tr>
        </thead>
        <tbody>
          {data.byKind.map((k) => (
            <tr key={k.kind} className="text-[12px]">
              <td className={td}>
                <div className="font-medium text-text-pri">{AI_KIND_LABEL[k.kind].label}</div>
                <div className="text-[11px] text-text-ter">{AI_KIND_LABEL[k.kind].detail}</div>
              </td>
              <td className={`${td} tabular-nums`}>
                {k.calls.toLocaleString('es-AR')}
                {k.failed > 0 && <div className="text-[10.5px] text-amber-700 dark:text-amber-300">{k.failed} con error</div>}
              </td>
              <td className={`${td} tabular-nums`}>{formatTokens(k.tokens)}</td>
              <td className={`${td} tabular-nums`}>
                <div className="font-semibold">{formatUsd(k.platformCostUsd)}</div>
                {k.ownCostUsd > 0 && <div className="text-[10.5px] text-text-ter">+ {formatUsd(k.ownCostUsd)} con su clave</div>}
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

      <div className="text-sm font-bold text-text-pri mt-5 mb-2">Por proveedor y modelo</div>
      {data.byModel.length === 0 ? (
        <div className="text-[12.5px] text-text-sec border border-dashed border-gray-border rounded-[8px] px-4 py-5 text-center">No hubo usos de IA en {monthLabel(data.month)}.</div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Proveedor</th>
              <th className={th}>Modelo</th>
              <th className={th}>Clave</th>
              <th className={th}>Usos</th>
              <th className={th}>Tokens</th>
              <th className={th}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {data.byModel.map((m) => (
              <tr key={`${m.provider}-${m.model}-${m.keySource}`} className="text-[12px]">
                <td className={td}>{m.provider === 'OPENAI' ? 'OpenAI' : m.provider === 'DEEPSEEK' ? 'DeepSeek' : m.provider}</td>
                <td className={`${td} font-mono text-[11.5px]`}>{m.model}</td>
                <td className={td}>
                  <Badge color={m.keySource === 'PROPIA' ? 'blue' : 'gray'}>{m.keySource === 'PROPIA' ? 'Propia' : 'Plataforma'}</Badge>
                </td>
                <td className={`${td} tabular-nums`}>{m.calls.toLocaleString('es-AR')}</td>
                <td className={`${td} tabular-nums`}>{formatTokens(m.tokens)}</td>
                <td className={`${td} tabular-nums font-semibold`}>{formatUsd(m.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <div className={`${card} mt-5`}>
        <div className="text-xs font-bold text-text-pri mb-3">Gasto de IA de la institución, últimos 6 meses</div>
        <div className="grid grid-cols-6 gap-2 items-end">
          {data.history.map((h) => {
            const value = h.platformCostUsd + h.ownCostUsd;
            return (
              <button
                key={h.month}
                type="button"
                onClick={() => load(h.month)}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 cursor-pointer ${h.month === data.month ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                title={`${h.calls} usos · plataforma ${formatUsd(h.platformCostUsd)} · propia ${formatUsd(h.ownCostUsd)}`}
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
          Total del mes elegido: {formatUsd(total)}. El costo surge de los tokens que informa el proveedor por el precio de cada modelo.
        </div>
      </div>
    </div>
  );
}
