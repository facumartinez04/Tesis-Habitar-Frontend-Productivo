import { useEffect, useState } from 'react';
import { HelpTip } from '../ui/HelpTip';
import { getAiUsage, type AiUsageSnapshot } from '../../../services/aiUsageService';
import { formatUsd, setInstitutionAiBudget } from '../../../services/aiCostService';
import { showError, showSuccess } from '../../../lib/alerts';
import { t, useI18n } from '../../../i18n';

export function AiBudgetCard({ institutionId }: { institutionId: string }) {
  useI18n();
  const [usage, setUsage] = useState<AiUsageSnapshot | null>(null);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getAiUsage(institutionId)
      .then((u) => {
        setUsage(u);
        setInput(u.budgetUsd === null || u.budgetUsd === undefined ? '' : String(u.budgetUsd));
      })
      .catch(() => setUsage(null));
  }

  useEffect(load, [institutionId]);

  async function save(budget: number | null) {
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      void showError(t('Tope inválido'), t('Ingresá un monto en dólares, o dejalo vacío para no tener tope.'));
      return;
    }
    setSaving(true);
    try {
      await setInstitutionAiBudget(institutionId, budget);
      void showSuccess(budget === null ? t('Tope quitado') : t('Tope de {usd} guardado', { usd: formatUsd(budget) }));
      load();
    } catch (err) {
      void showError(t('No se pudo guardar el tope'), err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (!usage) return null;
  const spent = usage.spentUsd ?? 0;
  const budget = usage.budgetUsd ?? null;
  const remaining = budget === null ? null : Math.max(0, budget - spent);
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const barColor = usage.overBudget ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <div className="bg-card-bg border border-gray-border rounded-xl p-4 mb-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-pri mb-1">
        {t('Tope mensual de gasto de IA')}
        <HelpTip
          text={t('Límite en dólares de lo que la institución puede gastar en IA por mes con la clave de Habitar. Al llegar al tope, las preguntas se generan por plantilla, las respuestas abiertas las corrige el docente y la ayuda a los alumnos se pausa hasta el mes siguiente.')}
        />
      </div>
      <div className="text-[11.5px] text-text-sec mb-3">{t('Mes en curso: {period}', { period: usage.periodLabel })}</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="bg-surface rounded-lg px-3 py-2.5">
          <div className="text-[10.5px] text-text-ter uppercase tracking-wider font-semibold">{t('Gastado')}</div>
          <div className="text-lg font-bold text-text-pri tabular-nums">{formatUsd(spent)}</div>
        </div>
        <div className="bg-surface rounded-lg px-3 py-2.5">
          <div className="text-[10.5px] text-text-ter uppercase tracking-wider font-semibold">{t('Tope')}</div>
          <div className="text-lg font-bold text-text-pri tabular-nums">{budget === null ? t('Sin tope') : formatUsd(budget)}</div>
        </div>
        <div className="bg-surface rounded-lg px-3 py-2.5">
          <div className="text-[10.5px] text-text-ter uppercase tracking-wider font-semibold">{t('Queda')}</div>
          <div className={`text-lg font-bold tabular-nums ${usage.overBudget ? 'text-red' : 'text-text-pri'}`}>
            {remaining === null ? '—' : formatUsd(remaining)}
          </div>
        </div>
      </div>

      {budget !== null && (
        <div className="mb-3">
          <div className="h-2 rounded-full bg-stone-100 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] text-text-sec mt-1">
            {usage.overBudget ? t('Tope alcanzado: la IA queda pausada hasta el mes que viene') : t('{value}% del tope', { value: pct })}
          </div>
        </div>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save(input.trim() === '' ? null : Number(input.replace(',', '.')));
        }}
      >
        <label className="text-[12px] text-text-sec" htmlFor="ai-budget-input">
          {t('Tope mensual (US$)')}
        </label>
        <input
          id="ai-budget-input"
          type="number"
          min={0}
          step="0.5"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('Sin tope')}
          className="w-28 border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] bg-white dark:bg-[#1A1E29]"
        />
        <button type="submit" disabled={saving} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          {saving ? t('Guardando…') : t('Guardar tope')}
        </button>
        {budget !== null && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(null)}
            className="text-[11.5px] font-semibold text-text-sec hover:text-text-pri underline cursor-pointer"
          >
            {t('Quitar tope')}
          </button>
        )}
      </form>
    </div>
  );
}
