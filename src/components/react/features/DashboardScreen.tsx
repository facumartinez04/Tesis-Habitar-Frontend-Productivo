import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { SkeletonTable } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { apiFetch } from '../../../lib/apiClient';
import { sessionStore } from '../../../store/sessionStore';
import type { IconName } from '../../../lib/iconPaths';

type Avg = { literal: number | null; inferencial: number | null; critico: number | null };
type Status = 'BIEN' | 'REGULAR' | 'BAJO' | 'SIN_DATOS';

interface Dashboard {
  courses: { id: string; name: string }[];
  students: { id: string; name: string; courseName: string }[];
  kpis: {
    responses: number;
    students: number;
    activities: number;
    averages: Avg;
    criticoPending: number;
    pendingReviews: number;
    helpQuestions: number;
  } | null;
  byDay: { day: string; responses: number; averages: Avg }[];
  byCourse: { id: string; name: string; responses: number; students: number; activities: number; averages: Avg }[];
  byStudent: { id: string; name: string; courseName: string; responses: number; lastDay: string; averages: Avg; status: Status }[];
  byActivity: { id: string; name: string; code: string; courseName: string; date: string; responses: number; averages: Avg }[];
  timeline: { id: string; name: string; day: string; diagnosticType: string | null; averages: Avg }[];
  diagnostic: { inicio: { responses: number; averages: Avg } | null; cierre: { responses: number; averages: Avg } | null };
}

type AxisRow = { label: string; title: string; averages: Avg };

const AXES = [
  { key: 'literal', label: 'Literal', light: '#2a78d6', dark: '#3987e5' },
  { key: 'inferencial', label: 'Inferencial', light: '#eb6834', dark: '#d95926' },
  { key: 'critico', label: 'Crítico', light: '#1baf7a', dark: '#199e70' },
] as const;

const STATUS: Record<Status, { label: string; icon: IconName; cls: string }> = {
  BIEN: { label: 'Bien', icon: 'check', cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
  REGULAR: { label: 'Regular', icon: 'alertTriangle', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  BAJO: { label: 'Bajo', icon: 'trendingDown', cls: 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300' },
  SIN_DATOS: { label: 'Sin datos', icon: 'info', cls: 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300' },
};

function todayAR(offsetDays = 0): string {
  return new Date(Date.now() - 3 * 3600 * 1000 + offsetDays * 86400 * 1000).toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '7 días', from: () => todayAR(-6) },
  { label: '30 días', from: () => todayAR(-29) },
  { label: '90 días', from: () => todayAR(-89) },
  { label: 'Todo', from: () => '' },
];

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
const dayLabel = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

function useDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark');
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, w];
}

function readQuery() {
  const q = new URLSearchParams(window.location.search);
  return { courseId: q.get('aula') ?? '', studentId: q.get('alumno') ?? '', from: q.get('desde') ?? todayAR(-29), to: q.get('hasta') ?? '' };
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

function download(name: string, csv: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DashboardScreen() {
  const [filters, setFilters] = useState({ courseId: '', studentId: '', from: '', to: '' });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setFilters(readQuery());
    setReady(true);
  }, []);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'alumnos' | 'aulas' | 'actividades'>('alumnos');
  const [search, setSearch] = useState('');
  const dark = useDark();

  useEffect(() => {
    if (!ready) return;
    if (!sessionStore.get()?.token) {
      window.location.href = '/login';
      return;
    }
    const params = new URLSearchParams();
    if (filters.courseId) params.set('courseId', filters.courseId);
    if (filters.studentId) params.set('studentId', filters.studentId);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const url = new URLSearchParams();
    if (filters.courseId) url.set('aula', filters.courseId);
    if (filters.studentId) url.set('alumno', filters.studentId);
    if (filters.from) url.set('desde', filters.from);
    if (filters.to) url.set('hasta', filters.to);
    window.history.replaceState(null, '', `${window.location.pathname}${url.toString() ? `?${url}` : ''}`);
    setLoading(true);
    apiFetch<Dashboard>(`/dashboard?${params.toString()}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'No se pudo cargar el tablero'))
      .finally(() => setLoading(false));
  }, [filters, ready]);

  const studentOptions = useMemo(() => data?.students ?? [], [data]);
  const term = search.trim().toLowerCase();
  const studentsRows = (data?.byStudent ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || s.courseName.toLowerCase().includes(term));
  const activitiesRows = (data?.byActivity ?? []).filter((a) => !term || a.name.toLowerCase().includes(term) || a.code.toLowerCase().includes(term));
  const pagedStudents = usePagination(studentsRows, 15, `${term}|${JSON.stringify(filters)}`);
  const pagedActivities = usePagination(activitiesRows, 15, `${term}|${JSON.stringify(filters)}`);

  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));
  const activePreset = PRESETS.find((p) => p.from() === filters.from && !filters.to)?.label;
  const k = data?.kpis;
  const selectedStudent = data?.students.find((s) => s.id === filters.studentId) ?? null;
  const selectedCourse = data?.courses.find((c) => c.id === filters.courseId) ?? null;

  function printReport() {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const theme = root.dataset.theme;
    root.classList.remove('dark');
    if (theme) root.dataset.theme = 'light';
    const restore = () => {
      if (wasDark) root.classList.add('dark');
      if (theme) root.dataset.theme = theme;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.setTimeout(() => window.print(), 150);
  }
  const color = (i: number) => (dark ? AXES[i].dark : AXES[i].light);

  function exportCurrent() {
    if (!data) return;
    const head = ['Literal', 'Inferencial', 'Crítico'];
    if (tab === 'alumnos')
      download('habitar_alumnos.csv', toCsv([['Alumno', 'Aula', 'Actividades', ...head, 'Estado', 'Última'], ...studentsRows.map((s) => [s.name, s.courseName, s.responses, s.averages.literal, s.averages.inferencial, s.averages.critico, STATUS[s.status].label, s.lastDay])]));
    else if (tab === 'aulas')
      download('habitar_aulas.csv', toCsv([['Aula', 'Alumnos', 'Actividades', 'Respuestas', ...head], ...data.byCourse.map((c) => [c.name, c.students, c.activities, c.responses, c.averages.literal, c.averages.inferencial, c.averages.critico])]));
    else
      download('habitar_actividades.csv', toCsv([['Actividad', 'Código', 'Aula', 'Fecha', 'Respuestas', ...head], ...activitiesRows.map((a) => [a.name, a.code, a.courseName, a.date, a.responses, a.averages.literal, a.averages.inferencial, a.averages.critico])]));
  }

  const select = 'px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white min-w-0';
  const th = 'text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white';
  const td = 'px-2.5 py-2.5 border-b border-gray-border';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2 print-hide">
        <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Tablero</div>
        {k && k.responses > 0 && (
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-gray-border rounded-[6px] px-2.5 py-[6px] text-text-pri hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
          >
            <Icon name="printer" size={12} />
            Informe PDF
          </button>
        )}
      </div>
      <div className="print-only mb-4">
        <div className="text-xl font-bold">Informe de comprensión lectora</div>
        <div className="text-[12px] mt-1">
          {selectedStudent ? `Alumno: ${selectedStudent.name} · ` : ''}
          {selectedCourse ? `Aula: ${selectedCourse.name} · ` : selectedStudent ? '' : 'Todas las aulas · '}
          Período: {filters.from ? dayLabel(filters.from) : 'desde el inicio'} a {filters.to ? dayLabel(filters.to) : 'hoy'}
        </div>
        <div className="text-[11px] text-neutral-500 mt-0.5">
          Generado el {new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })} · Habitar
        </div>
      </div>
      <div className="text-[12.5px] text-text-sec mb-4 print-hide">Comprensión lectora por eje. Filtrá por aula, alumno o días; los filtros quedan en la dirección para compartir la vista.</div>

      <div className="flex flex-wrap items-end gap-2 mb-4 bg-card-bg border border-gray-border rounded-xl p-3 print-hide">
        <label className="text-[11px] text-text-sec font-medium flex flex-col gap-1">
          Aula
          <select value={filters.courseId} onChange={(e) => set({ courseId: e.target.value, studentId: '' })} className={select}>
            <option value="">Todas las aulas</option>
            {data?.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-text-sec font-medium flex flex-col gap-1">
          Alumno
          <select value={filters.studentId} onChange={(e) => set({ studentId: e.target.value })} className={`${select} max-w-[220px]`}>
            <option value="">Todos los alumnos</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {filters.courseId ? '' : ` · ${s.courseName}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-text-sec font-medium flex flex-col gap-1">
          Desde
          <input type="date" value={filters.from} max={filters.to || todayAR()} onChange={(e) => set({ from: e.target.value })} className={select} />
        </label>
        <label className="text-[11px] text-text-sec font-medium flex flex-col gap-1">
          Hasta
          <input type="date" value={filters.to} min={filters.from || undefined} max={todayAR()} onChange={(e) => set({ to: e.target.value })} className={select} />
        </label>
        <div className="flex gap-1" role="group" aria-label="Períodos rápidos">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => set({ from: p.from(), to: '' })}
              aria-pressed={activePreset === p.label}
              className={`px-2.5 py-[7px] rounded-[6px] text-[11.5px] font-semibold border cursor-pointer ${
                activePreset === p.label ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-gray-border text-text-sec hover:text-text-pri'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {(filters.courseId || filters.studentId) && (
          <button type="button" onClick={() => set({ courseId: '', studentId: '' })} className="text-[11.5px] font-semibold text-text-sec hover:text-text-pri underline cursor-pointer px-1 py-[7px]">
            Quitar filtros
          </button>
        )}
        {loading && data && <span className="text-[11px] text-text-ter py-[7px]">Actualizando…</span>}
      </div>

      {error && <div className="text-sm text-red mb-3">{error}</div>}
      {!data ? (
        <SkeletonTable />
      ) : !k || k.responses === 0 ? (
        <div className="bg-card-bg border border-gray-border rounded-xl px-5 py-10 text-center text-sm text-text-sec">
          {data.courses.length === 0 ? 'Todavía no hay aulas para mostrar.' : 'No hay respuestas con estos filtros. Probá con otro período o con todas las aulas.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
            <Tile label="Respuestas" value={k.responses.toLocaleString('es-AR')} />
            <Tile label="Alumnos" value={k.students.toLocaleString('es-AR')} />
            <Tile label="Actividades" value={k.activities.toLocaleString('es-AR')} />
            {AXES.map((a, i) => (
              <Tile key={a.key} label={`Promedio ${a.label.toLowerCase()}`} value={pct(k.averages[a.key])} dot={color(i)} />
            ))}
            <Tile
              label="Por revisar"
              value={k.pendingReviews.toLocaleString('es-AR')}
              hint={`${k.helpQuestions} dudas sobre el texto`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Respuestas por día">
              <ResponsesChart rows={data.byDay} color={color(0)} />
            </ChartCard>
            <ChartCard title="Promedio por eje, por día">
              <AxesChart rows={data.byDay.map((d) => ({ label: dayLabel(d.day), title: dayLabel(d.day), averages: d.averages }))} colors={AXES.map((_, i) => color(i))} />
            </ChartCard>
          </div>

          {(selectedStudent && data.timeline.length > 0) || data.diagnostic.inicio || data.diagnostic.cierre ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 print-avoid-break">
              {selectedStudent && data.timeline.length > 0 && (
                <ChartCard title={`Evolución de ${selectedStudent.name}, actividad por actividad`}>
                  <AxesChart
                    rows={data.timeline.map((t, i) => ({
                      label: `${i + 1}`,
                      title: `${i + 1}. ${t.name} · ${dayLabel(t.day)}${t.diagnosticType ? ` (diagnóstica de ${t.diagnosticType === 'INICIO' ? 'inicio' : 'cierre'})` : ''}`,
                      averages: t.averages,
                    }))}
                    colors={AXES.map((_, i) => color(i))}
                  />
                  <ol className="mt-2 text-[11px] text-text-sec space-y-0.5 list-decimal pl-5">
                    {data.timeline.map((t) => (
                      <li key={t.id}>
                        {t.name} · {dayLabel(t.day)}
                        {t.diagnosticType && <span className="text-text-ter"> · diagnóstica de {t.diagnosticType === 'INICIO' ? 'inicio' : 'cierre'}</span>}
                      </li>
                    ))}
                  </ol>
                </ChartCard>
              )}
              {(data.diagnostic.inicio || data.diagnostic.cierre) && (
                <ChartCard title="Diagnóstica: inicio contra cierre">
                  <DiagnosticTable diagnostic={data.diagnostic} colors={AXES.map((_, i) => color(i))} />
                </ChartCard>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 print-hide">
            <div className="flex gap-1 border-b border-gray-border" role="tablist">
              {(['alumnos', 'aulas', 'actividades'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px capitalize cursor-pointer ${tab === t ? 'border-emerald-600 text-text-pri' : 'border-transparent text-text-sec hover:text-text-pri'}`}
                >
                  Por {t === 'alumnos' ? 'alumno' : t === 'aulas' ? 'aula' : 'actividad'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {tab !== 'aulas' && (
                <div className="relative">
                  <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-8 pr-2.5 py-[6px] border border-gray-border rounded-[6px] text-[12.5px] w-44" />
                </div>
              )}
              <button type="button" onClick={exportCurrent} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-gray-border rounded-[6px] px-2.5 py-[6px] text-text-pri hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                <Icon name="download" size={12} />
                Descargar CSV
              </button>
            </div>
          </div>

          {tab === 'alumnos' && (
            <div className="print-hide">
              <TableWrap>
                <thead>
                  <tr>
                    <th className={th}>Alumno</th>
                    <th className={th}>Aula</th>
                    <th className={th}>Actividades</th>
                    {AXES.map((a) => (
                      <th key={a.key} className={th}>{a.label}</th>
                    ))}
                    <th className={th}>Estado</th>
                    <th className={th}>Última</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStudents.pageItems.map((s) => (
                    <tr key={s.id}>
                      <td className={td}>
                        <button type="button" onClick={() => set({ studentId: s.id })} className="font-medium text-text-pri hover:underline cursor-pointer text-left" title="Ver sólo este alumno">
                          {s.name}
                        </button>
                      </td>
                      <td className={`${td} text-text-sec`}>{s.courseName}</td>
                      <td className={`${td} tabular-nums`}>{s.responses}</td>
                      {AXES.map((a) => (
                        <td key={a.key} className={`${td} tabular-nums`}>{pct(s.averages[a.key])}</td>
                      ))}
                      <td className={td}>
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${STATUS[s.status].cls}`}>
                          <Icon name={STATUS[s.status].icon} size={11} />
                          {STATUS[s.status].label}
                        </span>
                      </td>
                      <td className={`${td} text-[11.5px] text-text-sec tabular-nums`}>{dayLabel(s.lastDay)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pagination page={pagedStudents.page} totalPages={pagedStudents.totalPages} total={pagedStudents.total} pageSize={pagedStudents.pageSize} onChange={pagedStudents.setPage} label="alumnos" />
            </div>
          )}

          {tab === 'aulas' && (
            <div className="print-hide">
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Aula</th>
                  <th className={th}>Alumnos</th>
                  <th className={th}>Actividades</th>
                  <th className={th}>Respuestas</th>
                  {AXES.map((a) => (
                    <th key={a.key} className={th}>{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.byCourse.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <button type="button" onClick={() => set({ courseId: c.id, studentId: '' })} className="font-medium text-text-pri hover:underline cursor-pointer text-left" title="Ver sólo esta aula">
                        {c.name}
                      </button>
                    </td>
                    <td className={`${td} tabular-nums`}>{c.students}</td>
                    <td className={`${td} tabular-nums`}>{c.activities}</td>
                    <td className={`${td} tabular-nums`}>{c.responses}</td>
                    {AXES.map((a) => (
                      <td key={a.key} className={`${td} tabular-nums`}>{pct(c.averages[a.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            </div>
          )}

          {tab === 'actividades' && (
            <div className="print-hide">
              <TableWrap>
                <thead>
                  <tr>
                    <th className={th}>Actividad</th>
                    <th className={th}>Aula</th>
                    <th className={th}>Fecha</th>
                    <th className={th}>Respuestas</th>
                    {AXES.map((a) => (
                      <th key={a.key} className={th}>{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedActivities.pageItems.map((a) => (
                    <tr key={a.id}>
                      <td className={td}>
                        <div className="font-medium">{a.name}</div>
                        <div className="font-mono text-[10.5px] text-text-ter">{a.code}</div>
                      </td>
                      <td className={`${td} text-text-sec`}>{a.courseName}</td>
                      <td className={`${td} text-[11.5px] text-text-sec tabular-nums`}>{dayLabel(a.date)}</td>
                      <td className={`${td} tabular-nums`}>{a.responses}</td>
                      {AXES.map((ax) => (
                        <td key={ax.key} className={`${td} tabular-nums`}>{pct(a.averages[ax.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pagination page={pagedActivities.page} totalPages={pagedActivities.totalPages} total={pagedActivities.total} pageSize={pagedActivities.pageSize} onChange={pagedActivities.setPage} label="actividades" />
            </div>
          )}
          <PrintTables data={data} />
          <p className="text-[11px] text-text-ter mt-3">
            El eje crítico promedia sólo las respuestas ya revisadas por el docente. Estado: «Bajo» si algún eje está debajo de 40 %, «Regular»
            debajo de 60 %.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, hint, dot }: { label: string; value: string; hint?: string; dot?: string }) {
  return (
    <div className="bg-card-bg border border-gray-border rounded-xl px-3.5 py-3">
      <div className="text-[10.5px] text-text-ter uppercase tracking-wider font-semibold flex items-center gap-1.5">
        {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
        {label}
      </div>
      <div className="text-xl font-bold text-text-pri tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[10.5px] text-text-sec mt-0.5">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card-bg border border-gray-border rounded-xl p-4">
      <div className="text-xs font-bold text-text-pri mb-2">{title}</div>
      {children}
    </div>
  );
}

const H = 190;
const PAD = { l: 34, r: 100, t: 10, b: 24 };

function xTicks(n: number): number[] {
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / 5;
  return Array.from({ length: 6 }, (_, i) => Math.round(i * step));
}

function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x + 10, 0), width - 170);
  return (
    <div className="absolute top-1 pointer-events-none bg-card-bg border border-gray-border shadow-lg rounded-lg px-2.5 py-1.5 text-[11px] text-text-pri w-[160px] z-10" style={{ left }}>
      {children}
    </div>
  );
}

function ResponsesChart({ rows, color }: { rows: Dashboard['byDay']; color: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.responses));
  const niceMax = max <= 5 ? max : Math.ceil(max / 5) * 5;
  const innerW = Math.max(0, width - PAD.l - 16);
  const innerH = H - PAD.t - PAD.b;
  const band = rows.length ? innerW / rows.length : 0;
  const barW = Math.max(2, Math.min(28, band - 2));
  const y = (v: number) => PAD.t + innerH - (v / niceMax) * innerH;
  const ticks = niceMax <= 5 ? Array.from({ length: niceMax + 1 }, (_, i) => i) : [0, niceMax / 2, niceMax];

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Respuestas por día: ${rows.map((r) => `${dayLabel(r.day)} ${r.responses}`).join(', ')}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - 16} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-white/10" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" className="fill-current text-text-ter" fontSize={10}>
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x = PAD.l + i * band + (band - barW) / 2;
            const h = Math.max(0, PAD.t + innerH - y(r.responses));
            return (
              <g key={r.day} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.l + i * band} y={PAD.t} width={band} height={innerH} fill="transparent" />
                <path
                  d={`M${x},${PAD.t + innerH} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${Math.max(0, barW - 8)} q4,0 4,4 v${Math.max(0, h - 4)} z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              </g>
            );
          })}
          {xTicks(rows.length).map((i) => (
            <text key={i} x={PAD.l + i * band + band / 2} y={H - 6} textAnchor="middle" className="fill-current text-text-ter" fontSize={10}>
              {dayLabel(rows[i].day)}
            </text>
          ))}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={PAD.l + hover * band + band / 2} width={width}>
          <div className="font-semibold">{dayLabel(rows[hover].day)}</div>
          <div className="tabular-nums">
            {rows[hover].responses} {rows[hover].responses === 1 ? 'respuesta' : 'respuestas'}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

function AxesChart({ rows, colors }: { rows: AxisRow[]; colors: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(0, width - PAD.l - PAD.r);
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (rows.length <= 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / 100) * innerH;

  const lines = AXES.map((a) => {
    const pts = rows.map((r, i) => ({ i, v: r.averages[a.key] })).filter((p): p is { i: number; v: number } => p.v !== null);
    return { ...a, pts };
  });
  const ends = lines
    .map((l, idx): { idx: number; v: number | null } => ({ idx, v: l.pts.length ? l.pts[l.pts.length - 1].v : null }))
    .filter((e): e is { idx: number; v: number } => e.v !== null)
    .sort((a, b) => b.v - a.v);
  let last = -Infinity;
  const endY = new Map<number, number>();
  for (const e of ends) {
    const yy = Math.max(y(e.v) + 3, last + 12);
    endY.set(e.idx, yy);
    last = yy;
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!rows.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.l;
    const i = rows.length <= 1 ? 0 : Math.round((px / innerW) * (rows.length - 1));
    setHover(Math.min(rows.length - 1, Math.max(0, i)));
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-3 mb-1 text-[11px] text-text-sec" aria-hidden="true">
        {AXES.map((a, i) => (
          <span key={a.key} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-[2px] rounded" style={{ background: colors[i] }} />
            {a.label}
          </span>
        ))}
      </div>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Promedio por eje y por día, de 0 a 100 %"
        >
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={PAD.l + innerW} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-white/10" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" className="fill-current text-text-ter" fontSize={10}>
                {t}%
              </text>
            </g>
          ))}
          {xTicks(rows.length).map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-current text-text-ter" fontSize={10}>
              {rows[i].label}
            </text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH} className="stroke-gray-300 dark:stroke-white/20" strokeWidth={1} />}
          {lines.map((l, idx) => (
            <g key={l.key}>
              {l.pts.length > 1 && (
                <polyline
                  points={l.pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
                  fill="none"
                  stroke={colors[idx]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {l.pts.map((p) => (
                <circle
                  key={p.i}
                  cx={x(p.i)}
                  cy={y(p.v)}
                  r={hover === p.i || l.pts.length === 1 ? 4.5 : 3}
                  fill={colors[idx]}
                  className="stroke-[var(--color-card-bg,#fff)]"
                  strokeWidth={2}
                />
              ))}
              {endY.has(idx) && (
                <text x={PAD.l + innerW + 8} y={endY.get(idx)} className="fill-current text-text-sec" fontSize={10.5}>
                  {l.label} {l.pts[l.pts.length - 1].v}%
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={x(hover)} width={width}>
          <div className="font-semibold mb-0.5">{rows[hover].title}</div>
          {AXES.map((a, i) => (
            <div key={a.key} className="flex items-center justify-between gap-2 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
                {a.label}
              </span>
              <span>{pct(rows[hover].averages[a.key])}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

function DiagnosticTable({ diagnostic, colors }: { diagnostic: Dashboard['diagnostic']; colors: string[] }) {
  const th = 'text-left text-[11px] text-text-sec font-medium px-2 py-1.5 border-b border-gray-border';
  const td = 'px-2 py-2 border-b border-gray-border tabular-nums text-[12.5px]';
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Eje</th>
            <th className={th}>Inicio</th>
            <th className={th}>Cierre</th>
            <th className={th}>Cambio</th>
          </tr>
        </thead>
        <tbody>
          {AXES.map((a, i) => {
            const ini = diagnostic.inicio?.averages[a.key] ?? null;
            const fin = diagnostic.cierre?.averages[a.key] ?? null;
            const delta = ini !== null && fin !== null ? fin - ini : null;
            return (
              <tr key={a.key}>
                <td className={td}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
                    {a.label}
                  </span>
                </td>
                <td className={td}>{pct(ini)}</td>
                <td className={td}>{pct(fin)}</td>
                <td className={td}>
                  {delta === null ? (
                    <span className="text-text-ter">—</span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        delta > 0 ? 'text-emerald-700 dark:text-emerald-300' : delta < 0 ? 'text-red-700 dark:text-red-300' : 'text-text-sec'
                      }`}
                    >
                      <Icon name={delta > 0 ? 'trendingUp' : delta < 0 ? 'trendingDown' : 'minus'} size={12} />
                      {delta > 0 ? '+' : ''}
                      {delta} pts
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-text-ter mt-2">
        {diagnostic.inicio ? `${diagnostic.inicio.responses} respuestas de inicio` : 'Sin diagnóstica de inicio en el período'} ·{' '}
        {diagnostic.cierre ? `${diagnostic.cierre.responses} de cierre` : 'sin diagnóstica de cierre todavía'}
      </p>
    </div>
  );
}

function PrintTables({ data }: { data: Dashboard }) {
  const th = 'text-left text-[10px] font-semibold px-1.5 py-1 border-b border-neutral-300';
  const td = 'px-1.5 py-1 border-b border-neutral-200 text-[10.5px]';
  return (
    <div className="print-only">
      <div className="text-[13px] font-bold mt-4 mb-1">Por aula</div>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Aula</th>
            <th className={th}>Alumnos</th>
            <th className={th}>Actividades</th>
            {AXES.map((a) => (
              <th key={a.key} className={th}>{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.byCourse.map((c) => (
            <tr key={c.id}>
              <td className={td}>{c.name}</td>
              <td className={td}>{c.students}</td>
              <td className={td}>{c.activities}</td>
              {AXES.map((a) => (
                <td key={a.key} className={td}>{pct(c.averages[a.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[13px] font-bold mt-4 mb-1">Por alumno</div>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Alumno</th>
            <th className={th}>Aula</th>
            <th className={th}>Act.</th>
            {AXES.map((a) => (
              <th key={a.key} className={th}>{a.label}</th>
            ))}
            <th className={th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.byStudent.map((s) => (
            <tr key={s.id}>
              <td className={td}>{s.name}</td>
              <td className={td}>{s.courseName}</td>
              <td className={td}>{s.responses}</td>
              {AXES.map((a) => (
                <td key={a.key} className={td}>{pct(s.averages[a.key])}</td>
              ))}
              <td className={td}>{STATUS[s.status].label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[13px] font-bold mt-4 mb-1">Por actividad</div>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Actividad</th>
            <th className={th}>Aula</th>
            <th className={th}>Fecha</th>
            <th className={th}>Resp.</th>
            {AXES.map((a) => (
              <th key={a.key} className={th}>{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.byActivity.map((a) => (
            <tr key={a.id}>
              <td className={td}>{a.name}</td>
              <td className={td}>{a.courseName}</td>
              <td className={td}>{dayLabel(a.date)}</td>
              <td className={td}>{a.responses}</td>
              {AXES.map((ax) => (
                <td key={ax.key} className={td}>{pct(a.averages[ax.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
