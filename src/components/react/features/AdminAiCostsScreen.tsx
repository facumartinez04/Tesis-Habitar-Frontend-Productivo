import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { SkeletonTable } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { useToast } from '../../../hooks/useToast';
import { ensureAdminSession } from '../../../services/authService';
import { apiFetch } from '../../../lib/apiClient';
import { confirmAction, showError } from '../../../lib/alerts';

interface InstitutionCost {
  institutionId: string;
  name: string;
  keySource: string;
  provider: string;
  budgetUsd: number | null;
  calls: number;
  failed: number;
  generation: number;
  grading: number;
  help: number;
  promptTokens: number;
  completionTokens: number;
  platformCostUsd: number;
  ownCostUsd: number;
  budgetUsedPct: number | null;
  overBudget: boolean;
}

interface Price {
  provider: string;
  model: string;
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
  updatedAt: string;
}

interface CostReport {
  month: string;
  currentMonth: string;
  totals: {
    platformCostUsd: number;
    ownCostUsd: number;
    calls: number;
    failed: number;
    promptTokens: number;
    completionTokens: number;
    generationCostUsd: number;
    gradingCostUsd: number;
    helpCostUsd: number;
  };
  history: { month: string; costUsd: number; calls: number }[];
  institutions: InstitutionCost[];
  prices: Price[];
  models: { provider: string; model: string; calls: number; hasPrice: boolean }[];
}

/** Montos chicos (centavos de dólar) con más decimales, para que no figuren en cero. */
function usd(n: number): string {
  const digits = n !== 0 && Math.abs(n) < 0.01 ? 4 : 2;
  return `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function tokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n);
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const th = 'text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white';
const td = 'px-2.5 py-2.5 border-b border-gray-border';

/**
 * Costo y gasto de IA de cada institución: cuánto le cuesta a la plataforma por mes (tokens × precio del modelo),
 * con un tope mensual por institución y la tabla de precios por modelo.
 */
export function AdminAiCostsScreen() {
  const { message, showToast } = useToast();
  const [month, setMonth] = useState('');
  const [report, setReport] = useState<CostReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState({ provider: 'DEEPSEEK', model: '', inputPerMTokUsd: '', outputPerMTokUsd: '' });

  const load = useCallback((m?: string) => {
    ensureAdminSession()
      .then(() => apiFetch<CostReport>(`/admin/ai-costs${m ? `?month=${m}` : ''}`))
      .then((data) => {
        setReport(data);
        setMonth(data.month);
        setBudgets(Object.fromEntries(data.institutions.map((i) => [i.institutionId, i.budgetUsd === null ? '' : String(i.budgetUsd)])));
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'No se pudo cargar el reporte'));
  }, []);

  useEffect(() => load(), [load]);

  const term = search.trim().toLowerCase();
  const filtered = (report?.institutions ?? []).filter((i) => !term || i.name.toLowerCase().includes(term));
  const paged = usePagination(filtered, 15, term);

  async function saveBudget(inst: InstitutionCost) {
    const raw = (budgets[inst.institutionId] ?? '').trim().replace(',', '.');
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      await showError('Tope inválido', 'Ingresá un monto en dólares, o dejalo vacío para no tener tope.');
      return;
    }
    const ok = await confirmAction({
      title: value === null ? `¿Quitar el tope de ${inst.name}?` : `¿Fijar un tope de ${usd(value)} por mes para ${inst.name}?`,
      text:
        value === null
          ? 'La institución va a poder usar la IA sin límite de gasto.'
          : 'Al llegar al tope, ese mes las preguntas se generan por plantilla, las respuestas abiertas las corrige el docente y la ayuda a los alumnos queda pausada.',
      confirmButtonText: 'Guardar tope',
    });
    if (!ok) return;
    setSavingId(inst.institutionId);
    try {
      await apiFetch(`/admin/institutions/${inst.institutionId}/ai-budget`, { method: 'PATCH', body: { budgetUsd: value } });
      showToast(value === null ? 'Tope quitado' : `Tope de ${usd(value)} guardado`);
      load(month);
    } catch (err) {
      await showError('No se pudo guardar el tope', err instanceof Error ? err.message : undefined);
    } finally {
      setSavingId(null);
    }
  }

  async function savePrice(form = priceForm) {
    const input = Number(String(form.inputPerMTokUsd).replace(',', '.'));
    const output = Number(String(form.outputPerMTokUsd).replace(',', '.'));
    if (!form.model.trim() || !Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) {
      await showError('Precio incompleto', 'Completá el modelo y los precios por millón de tokens (entrada y salida).');
      return;
    }
    try {
      await apiFetch('/admin/ai-prices', { method: 'PUT', body: { provider: form.provider, model: form.model.trim(), inputPerMTokUsd: input, outputPerMTokUsd: output } });
      setPriceForm({ provider: 'DEEPSEEK', model: '', inputPerMTokUsd: '', outputPerMTokUsd: '' });
      showToast('Precio guardado. Se aplica a las llamadas de ahora en adelante.');
      load(month);
    } catch (err) {
      await showError('No se pudo guardar el precio', err instanceof Error ? err.message : undefined);
    }
  }

  async function deletePrice(p: Price) {
    const ok = await confirmAction({ title: `¿Borrar el precio de ${p.model}?`, confirmButtonText: 'Borrar' });
    if (!ok) return;
    await apiFetch(`/admin/ai-prices/${p.provider}/${encodeURIComponent(p.model)}`, { method: 'DELETE' });
    load(month);
  }

  if (error && !report) return <div className="text-sm text-red">{error}</div>;
  if (!report) return <SkeletonTable />;

  const t = report.totals;
  const missing = report.models.filter((m) => !m.hasPrice);
  const maxHistory = Math.max(...report.history.map((h) => h.costUsd), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-[18px]">
        <div>
          <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Costos de IA</div>
          <div className="text-[12.5px] text-text-sec">
            Cuánto le cuesta la IA a la plataforma por institución: tokens que informa el proveedor × precio del modelo.
          </div>
        </div>
        <label className="text-[11px] text-text-sec font-medium">
          Mes
          <input
            type="month"
            value={month}
            max={report.currentMonth}
            onChange={(e) => e.target.value && load(e.target.value)}
            className="block mt-1 px-2.5 py-[6px] border border-gray-border rounded-[6px] text-[12.5px]"
          />
        </label>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-card-bg border border-gray-border rounded-xl p-4">
          <div className="text-[11px] text-text-ter uppercase tracking-wider font-semibold">Gasto de la plataforma</div>
          <div className="text-2xl font-bold text-text-pri tabular-nums mt-1">{usd(t.platformCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            Preguntas {usd(t.generationCostUsd)} · Corrección {usd(t.gradingCostUsd)} · Ayuda {usd(t.helpCostUsd)}
          </div>
        </div>
        <div className="bg-card-bg border border-gray-border rounded-xl p-4">
          <div className="text-[11px] text-text-ter uppercase tracking-wider font-semibold">Con clave propia</div>
          <div className="text-2xl font-bold text-text-pri tabular-nums mt-1">{usd(t.ownCostUsd)}</div>
          <div className="text-[11px] text-text-sec mt-1">Lo paga cada institución a su proveedor</div>
        </div>
        <div className="bg-card-bg border border-gray-border rounded-xl p-4">
          <div className="text-[11px] text-text-ter uppercase tracking-wider font-semibold">Llamadas</div>
          <div className="text-2xl font-bold text-text-pri tabular-nums mt-1">{t.calls.toLocaleString('es-AR')}</div>
          <div className="text-[11px] text-text-sec mt-1">{t.failed} con error (no se cobran si el proveedor no respondió)</div>
        </div>
        <div className="bg-card-bg border border-gray-border rounded-xl p-4">
          <div className="text-[11px] text-text-ter uppercase tracking-wider font-semibold">Tokens</div>
          <div className="text-2xl font-bold text-text-pri tabular-nums mt-1">{tokens(t.promptTokens + t.completionTokens)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            {tokens(t.promptTokens)} de entrada · {tokens(t.completionTokens)} de salida
          </div>
        </div>
      </div>

      {/* Últimos meses */}
      <div className="bg-card-bg border border-gray-border rounded-xl p-4 mb-4">
        <div className="text-xs font-bold text-text-pri mb-3">Gasto de la plataforma, últimos 6 meses</div>
        <div className="grid grid-cols-6 gap-2 items-end">
          {report.history.map((h) => (
            <button
              key={h.month}
              type="button"
              onClick={() => load(h.month)}
              className={`flex flex-col items-center gap-1 rounded-lg p-1 cursor-pointer ${h.month === report.month ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
              title={`${h.calls} llamadas`}
            >
              <span className="text-[10.5px] text-text-sec tabular-nums">{usd(h.costUsd)}</span>
              <span className="w-full h-16 flex items-end">
                <span
                  className={`w-full rounded-t ${h.month === report.month ? 'bg-emerald-600' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                  style={{ height: `${maxHistory ? Math.max(4, Math.round((h.costUsd / maxHistory) * 100)) : 4}%` }}
                />
              </span>
              <span className="text-[10.5px] text-text-ter capitalize">{monthLabel(h.month)}</span>
            </button>
          ))}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 mb-4 text-xs text-amber-900 dark:text-amber-100">
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <Icon name="alertTriangle" size={13} />
            Hay modelos sin precio propio
          </div>
          Se están cobrando con el último precio cargado de su proveedor. Cargá su precio abajo para que el costo sea exacto:{' '}
          {missing.map((m, i) => (
            <button
              key={`${m.provider}-${m.model}`}
              type="button"
              onClick={() => setPriceForm({ provider: m.provider, model: m.model, inputPerMTokUsd: '', outputPerMTokUsd: '' })}
              className="font-semibold underline cursor-pointer"
            >
              {m.model} ({m.calls} llamadas){i < missing.length - 1 ? ', ' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Por institución */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-sm font-bold text-text-pri">Por institución</div>
        <div className="relative max-w-[260px] w-full">
          <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar institución…"
            className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
          />
        </div>
      </div>
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Institución</th>
            <th className={th}>Uso</th>
            <th className={th}>Tokens</th>
            <th className={th}>Gasto del mes</th>
            <th className={th}>Tope mensual (US$)</th>
          </tr>
        </thead>
        <tbody>
          {paged.pageItems.map((i) => (
            <tr key={i.institutionId}>
              <td className={td}>
                <div className="font-medium">{i.name}</div>
                <div className="flex gap-1 mt-0.5">
                  <Badge color={i.keySource === 'CUSTOM' ? 'blue' : 'gray'}>{i.keySource === 'CUSTOM' ? 'Clave propia' : 'Clave de la plataforma'}</Badge>
                </div>
              </td>
              <td className={`${td} text-[11.5px] text-text-sec tabular-nums whitespace-nowrap`}>
                {i.generation} preguntas · {i.grading} correcciones · {i.help} ayudas
                {i.failed > 0 && <div className="text-amber-700 dark:text-amber-300">{i.failed} con error</div>}
              </td>
              <td className={`${td} text-[11.5px] tabular-nums`}>{tokens(i.promptTokens + i.completionTokens)}</td>
              <td className={`${td} min-w-[150px]`}>
                <div className="font-semibold tabular-nums">{usd(i.platformCostUsd)}</div>
                {i.ownCostUsd > 0 && <div className="text-[10.5px] text-text-ter tabular-nums">+ {usd(i.ownCostUsd)} con su clave</div>}
                {i.budgetUsd !== null && (
                  <div className="mt-1">
                    <div className="h-1.5 rounded-full bg-gray-bg overflow-hidden">
                      <div
                        className={`h-full ${i.overBudget ? 'bg-red-500' : (i.budgetUsedPct ?? 0) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, i.budgetUsedPct ?? 0)}%` }}
                      />
                    </div>
                    <div className={`text-[10.5px] mt-0.5 ${i.overBudget ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-text-ter'}`}>
                      {i.overBudget ? 'Tope alcanzado: IA pausada este mes' : `${i.budgetUsedPct ?? 0}% del tope`}
                    </div>
                  </div>
                )}
              </td>
              <td className={td}>
                <div className="flex items-center gap-1.5">
                  <input
                    value={budgets[i.institutionId] ?? ''}
                    onChange={(e) => setBudgets((b) => ({ ...b, [i.institutionId]: e.target.value }))}
                    inputMode="decimal"
                    placeholder="Sin tope"
                    aria-label={`Tope mensual de ${i.name}`}
                    className="w-24 px-2 py-1 border border-gray-border rounded-[6px] text-[12px] tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={savingId === i.institutionId || (budgets[i.institutionId] ?? '') === (i.budgetUsd === null ? '' : String(i.budgetUsd))}
                    onClick={() => saveBudget(i)}
                    className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-[6px] px-2 py-1 disabled:opacity-40 cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
                {i.keySource === 'CUSTOM' && <div className="text-[10.5px] text-text-ter mt-0.5">El tope aplica a la clave de la plataforma</div>}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2.5 py-6 text-center text-text-ter text-[12px]">No hay instituciones que coincidan.</td>
            </tr>
          )}
        </tbody>
      </TableWrap>
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} onChange={paged.setPage} label="instituciones" />

      {/* Precios */}
      <div className="mt-6 text-sm font-bold text-text-pri mb-1">Precios por modelo</div>
      <div className="text-[11.5px] text-text-sec mb-2">
        En dólares por millón de tokens, según la lista de cada proveedor. Verificalos en su página: un cambio se aplica a las
        llamadas de ahí en adelante.
      </div>
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Proveedor</th>
            <th className={th}>Modelo</th>
            <th className={th}>Entrada / 1M</th>
            <th className={th}>Salida / 1M</th>
            <th className={th}>Actualizado</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {report.prices.map((p) => (
            <tr key={`${p.provider}-${p.model}`}>
              <td className={td}>{p.provider === 'OPENAI' ? 'OpenAI' : 'DeepSeek'}</td>
              <td className={`${td} font-mono text-[11.5px]`}>{p.model}</td>
              <td className={`${td} tabular-nums`}>{usd(p.inputPerMTokUsd)}</td>
              <td className={`${td} tabular-nums`}>{usd(p.outputPerMTokUsd)}</td>
              <td className={`${td} text-[11.5px] text-text-ter`}>{new Date(p.updatedAt).toLocaleDateString('es-AR')}</td>
              <td className={`${td} text-right whitespace-nowrap`}>
                <button
                  type="button"
                  onClick={() => setPriceForm({ provider: p.provider, model: p.model, inputPerMTokUsd: String(p.inputPerMTokUsd), outputPerMTokUsd: String(p.outputPerMTokUsd) })}
                  className="text-[11px] font-semibold text-text-sec hover:text-text-pri mr-2 cursor-pointer"
                >
                  Editar
                </button>
                <button type="button" onClick={() => deletePrice(p)} className="text-[11px] font-semibold text-red-700 dark:text-red-300 cursor-pointer">
                  Borrar
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td className={td}>
              <select
                value={priceForm.provider}
                onChange={(e) => setPriceForm((f) => ({ ...f, provider: e.target.value }))}
                className="px-2 py-1 border border-gray-border rounded-[6px] text-[12px]"
                aria-label="Proveedor"
              >
                <option value="DEEPSEEK">DeepSeek</option>
                <option value="OPENAI">OpenAI</option>
              </select>
            </td>
            <td className={td}>
              <input
                value={priceForm.model}
                onChange={(e) => setPriceForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="nombre del modelo"
                aria-label="Modelo"
                className="w-full min-w-[140px] px-2 py-1 border border-gray-border rounded-[6px] text-[12px] font-mono"
              />
            </td>
            <td className={td}>
              <input
                value={priceForm.inputPerMTokUsd}
                onChange={(e) => setPriceForm((f) => ({ ...f, inputPerMTokUsd: e.target.value }))}
                inputMode="decimal"
                placeholder="0,28"
                aria-label="Precio de entrada por millón"
                className="w-20 px-2 py-1 border border-gray-border rounded-[6px] text-[12px] tabular-nums"
              />
            </td>
            <td className={td}>
              <input
                value={priceForm.outputPerMTokUsd}
                onChange={(e) => setPriceForm((f) => ({ ...f, outputPerMTokUsd: e.target.value }))}
                inputMode="decimal"
                placeholder="0,42"
                aria-label="Precio de salida por millón"
                className="w-20 px-2 py-1 border border-gray-border rounded-[6px] text-[12px] tabular-nums"
              />
            </td>
            <td className={td} />
            <td className={`${td} text-right`}>
              <button
                type="button"
                onClick={() => savePrice()}
                className="text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-[6px] px-2.5 py-1 cursor-pointer"
              >
                Guardar precio
              </button>
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Toast message={message} />
    </div>
  );
}
