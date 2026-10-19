import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../ui/Icon';
import { QrBox } from '../ui/QrBox';
import { HabitarLoader } from '../ui/HabitarLoader';
import { ReviewAnswersModal } from './ReviewAnswersModal';
import { LiveQuestionsModal } from './LiveQuestionsModal';
import {
  closeActivityNow,
  getActivityLive,
  publishActivityNow,
  releaseQuestions,
  type LiveActivity,
} from '../../../services/activityService';
import { useLiveUpdates, usePolling } from '../../../lib/realtime';
import { confirmAction, confirmDestructive, showError } from '../../../lib/alerts';
import { pct } from '../../../lib/scores';
import { whenLabel } from '../../../lib/activityDates';

interface ActivityLivePanelProps {
  activityId: string;
  /** Acción extra al pie (por ejemplo, «Crear otra actividad» al terminar el asistente). */
  footer?: React.ReactNode;
}

const STATUS = {
  PROGRAMADA: { label: 'Programada', dot: 'bg-amber-500', text: 'text-amber-800 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  PUBLICADA: { label: 'Abierta', dot: 'bg-emerald-500', text: 'text-emerald-800 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  CERRADA: { label: 'Cerrada', dot: 'bg-stone-400', text: 'text-stone-600 dark:text-stone-300', bg: 'bg-stone-100 dark:bg-white/5' },
  BORRADOR: { label: 'Borrador', dot: 'bg-stone-400', text: 'text-stone-600 dark:text-stone-300', bg: 'bg-stone-100 dark:bg-white/5' },
} as const;

/** Tolerancia del servidor para los envíos finales después de la hora de cierre. */
const GRACE_MS = 10 * 60 * 1000;

function joinUrl(code: string): string {
  return `${window.location.origin}/actividad?code=${encodeURIComponent(code)}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m}:${String(s).padStart(2, '0')}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}

/** Sin moverse durante este tiempo, el alumno figura como inactivo (puede haberse ido de la página). */
const IDLE_MS = 3 * 60 * 1000;

interface StudentRow {
  name: string;
  phase: 'LEYENDO' | 'RESPONDIENDO' | 'ENVIADO';
  currentIndex: number;
  answeredCount: number;
  updatedAt: string;
  deviceTag: string | null;
  response: LiveActivity['responses'][number] | null;
  flags: LiveActivity['integrityEvents'];
}

/** Une el avance en vivo de cada alumno con su envío y sus avisos de integridad. */
function studentRows(live: LiveActivity): StudentRow[] {
  const byName = new Map<string, StudentRow>();
  for (const st of live.students) {
    byName.set(st.studentDisplayName, {
      name: st.studentDisplayName,
      phase: st.phase,
      currentIndex: st.currentIndex,
      answeredCount: st.answeredCount,
      updatedAt: st.updatedAt,
      deviceTag: st.deviceTag,
      response: null,
      flags: [],
    });
  }
  // Las respuestas vienen de la más nueva a la más vieja: queda el último intento de cada alumno.
  for (const r of live.responses) {
    const row = byName.get(r.studentDisplayName);
    if (row && !row.response) {
      row.response = r;
      row.phase = row.phase === 'ENVIADO' ? 'ENVIADO' : row.phase;
    } else if (!row) {
      byName.set(r.studentDisplayName, {
        name: r.studentDisplayName,
        phase: 'ENVIADO',
        currentIndex: 0,
        answeredCount: 0,
        updatedAt: r.submittedAt,
        deviceTag: null,
        response: r,
        flags: [],
      });
    }
  }
  for (const e of live.integrityEvents) {
    byName.get(e.studentDisplayName)?.flags.push(e);
  }
  const order = { RESPONDIENDO: 0, LEYENDO: 1, ENVIADO: 2 } as const;
  return [...byName.values()].sort(
    (a, b) => order[a.phase] - order[b.phase] || a.name.localeCompare(b.name, 'es', { numeric: true }),
  );
}

/**
 * Panel en vivo de una actividad: QR para proyectar, estado con cuenta regresiva y las respuestas que van llegando,
 * sin recargar (WebSocket, con un refresco lento de respaldo).
 */
export function ActivityLivePanel({ activityId, footer }: ActivityLivePanelProps) {
  const [live, setLive] = useState<LiveActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const load = useCallback(() => {
    getActivityLive(activityId)
      .then((data) => {
        setLive((prev) => {
          // Resalta por un momento la respuesta que acaba de llegar.
          if (prev && data.responses.length > prev.responses.length) setHighlight(data.responses[0]?.studentDisplayName ?? null);
          return data;
        });
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'No se pudo cargar la actividad'));
  }, [activityId]);

  useEffect(load, [load]);
  const connected = useLiveUpdates({ kind: 'live', activityId }, load);
  usePolling(load, 30_000, !connected);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!highlight) return;
    const id = window.setTimeout(() => setHighlight(null), 2500);
    return () => window.clearTimeout(id);
  }, [highlight]);

  useEffect(() => {
    if (!projecting) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setProjecting(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [projecting]);

  if (error && !live) {
    return <div className="text-sm text-red bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>;
  }
  if (!live) return <HabitarLoader size="lg" message="Cargando la actividad…" />;

  const status = STATUS[live.status];
  const opensIn = live.opensAt ? Date.parse(live.opensAt) - now : 0;
  const closesIn = live.closesAt ? Date.parse(live.closesAt) - now : 0;
  const rows = studentRows(live);
  const answered = rows.filter((r) => r.phase === 'ENVIADO').length;
  const reading = rows.filter((r) => r.phase === 'LEYENDO').length;
  const answering = rows.filter((r) => r.phase === 'RESPONDIENDO').length;
  const canRelease = live.status === 'PUBLICADA' && live.readingMode !== 'LIBRE' && !live.questionsReleasedAt;
  // Pasada la hora de cierre, durante unos minutos todavía entran los envíos automáticos de quienes respondían.
  const finishing = live.status === 'PUBLICADA' && Boolean(live.closesAt) && closesIn <= 0;
  const expected = Math.max(live.devicesInClassroom, rows.length);

  async function handlePublish() {
    const ok = await confirmAction({ title: '¿Abrir la actividad ahora?', text: 'Los alumnos van a poder entrar antes de la hora programada.', confirmButtonText: 'Abrir ahora' });
    if (!ok) return;
    setBusy(true);
    try {
      await publishActivityNow(activityId);
      load();
    } catch (err) {
      showError('No se pudo abrir', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    const ok = await confirmAction({
      title: '¿Pasar a todos a las preguntas?',
      text: `${reading > 0 ? `${reading} ${reading === 1 ? 'alumno sigue' : 'alumnos siguen'} leyendo. ` : ''}Todos los celulares pasan a las preguntas al instante.`,
      confirmButtonText: 'Pasar a las preguntas',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await releaseQuestions(activityId);
      load();
    } catch (err) {
      showError('No se pudo habilitar', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    const pending = reading + answering;
    const ok = await confirmDestructive({
      title: '¿Cerrar la actividad ahora?',
      text:
        (pending > 0
          ? `${pending} ${pending === 1 ? 'alumno todavía no envió: se manda' : 'alumnos todavía no enviaron: se manda'} lo que tengan respondido. `
          : '') + 'Nadie más puede entrar y el texto se borra de Habitar. Los resultados se conservan.',
      confirmButtonText: 'Cerrar ahora',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await closeActivityNow(activityId);
      load();
    } catch (err) {
      showError('No se pudo cerrar', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx || !live) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.src = await QRCode.toDataURL(joinUrl(live.code), { margin: 1, width: 440, color: { dark: '#1A1918', light: '#FFFFFF' } });
    await img.decode();
    ctx.drawImage(img, 80, 50, 440, 440);
    ctx.fillStyle = '#1A1918';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px ui-monospace, monospace';
    ctx.fillText(live.code, 300, 570);
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(live.name.slice(0, 40), 300, 625);
    ctx.fillStyle = '#5C5A56';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`${window.location.host}/actividad`, 300, 670);
    const link = document.createElement('a');
    link.download = `habitar_${live.code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-pri tracking-tight">{live.name}</h1>
          <p className="text-xs text-text-sec mt-0.5">
            {live.courseName} · {live.questionCount} preguntas · {live.attemptPolicy === 'UNICO' ? 'un intento' : 'con reintentos'}
            {live.diagnosticType && ` · diagnóstica de ${live.diagnosticType === 'INICIO' ? 'inicio' : 'cierre'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.bg} ${status.text}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} ${live.status === 'PUBLICADA' ? 'animate-pulse' : ''}`} />
            {status.label}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] text-text-ter"
            title={connected ? 'Las respuestas aparecen solas, sin recargar' : 'Reconectando: se actualiza cada 30 segundos'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-stone-400'}`} />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 items-start">
        {/* QR */}
        <div className="bg-card-bg border border-gray-border rounded-2xl p-5 flex flex-col items-center gap-3">
          <QrBox code={live.code} size="lg" />
          <p className="text-[11.5px] text-text-sec text-center max-w-[240px]">
            Escaneá el QR o entrá a <span className="font-semibold text-text-pri">{window.location.host}/actividad</span> con el código.
            {live.courseQrCode && <> También aparece en el QR fijo del aula ({live.courseQrCode}).</>}
          </p>
          <div className="grid grid-cols-3 gap-2 w-full">
            <button type="button" onClick={() => setProjecting(true)} className="flex flex-col items-center gap-1 rounded-xl border border-gray-border py-2 text-[11px] font-semibold text-text-pri hover:bg-gray-50 cursor-pointer">
              <Icon name="cast" size={15} />
              Proyectar
            </button>
            <button type="button" onClick={handleDownload} className="flex flex-col items-center gap-1 rounded-xl border border-gray-border py-2 text-[11px] font-semibold text-text-pri hover:bg-gray-50 cursor-pointer">
              <Icon name="download" size={15} />
              Descargar
            </button>
            <button type="button" onClick={() => window.print()} className="flex flex-col items-center gap-1 rounded-xl border border-gray-border py-2 text-[11px] font-semibold text-text-pri hover:bg-gray-50 cursor-pointer">
              <Icon name="printer" size={15} />
              Imprimir
            </button>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {/* Estado */}
          <div className="bg-card-bg border border-gray-border rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] font-semibold text-text-ter uppercase tracking-wider">
                  {live.status === 'PROGRAMADA' ? 'Empieza en' : live.status === 'PUBLICADA' ? (finishing ? 'Cerrando' : 'Cierra en') : 'Estado'}
                </div>
                <div className={`font-bold text-text-pri tabular-nums mt-1 ${finishing ? 'text-lg' : 'text-3xl'}`}>
                  {live.status === 'PROGRAMADA'
                    ? formatCountdown(opensIn)
                    : live.status === 'PUBLICADA'
                      ? finishing
                        ? 'Recibiendo los últimos envíos'
                        : live.closesAt
                          ? formatCountdown(closesIn)
                          : '—'
                      : 'Cerrada'}
                </div>
                {finishing && live.closesAt && (
                  <div className="text-xs text-text-sec mt-0.5">Se cierra sola a las {timeOf(new Date(Date.parse(live.closesAt) + GRACE_MS).toISOString())} h</div>
                )}
                <div className="text-xs text-text-sec mt-1">
                  Abre {whenLabel(live.availableFrom, live.startTime)} · cierra {whenLabel(live.endDate || live.availableFrom, live.endTime)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-text-ter uppercase tracking-wider">Enviaron</div>
                <div className="text-3xl font-bold text-text-pri tabular-nums mt-1">
                  {answered}
                  {expected > 0 && <span className="text-base font-semibold text-text-ter"> / {expected}</span>}
                </div>
                <div className="h-1.5 rounded-full bg-gray-bg mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${expected ? Math.round((answered / expected) * 100) : 0}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-sec mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {reading} leyendo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {answering} respondiendo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {answered} enviaron
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {live.status === 'PROGRAMADA' && (
                <button type="button" disabled={busy} onClick={handlePublish} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer">
                  Abrir ahora
                </button>
              )}
              {canRelease && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRelease}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="arrowRight" size={12} />
                  Pasar a todos a las preguntas
                </button>
              )}
              {live.questionsReleasedAt && live.status !== 'CERRADA' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl">
                  <Icon name="check" size={12} />
                  Preguntas habilitadas a las {timeOf(live.questionsReleasedAt)} h
                </span>
              )}
              {live.status !== 'CERRADA' && live.questions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuestionsOpen(true)}
                  className="inline-flex items-center gap-1.5 border border-gray-border text-text-pri hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  <Icon name="edit" size={12} />
                  Editar preguntas
                </button>
              )}
              {live.status === 'PUBLICADA' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer sm:ml-auto"
                >
                  <Icon name="close" size={12} />
                  Cerrar ahora
                </button>
              )}
              {answered > 0 && (
                <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5 border border-gray-border text-text-pri hover:bg-gray-50 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                  <Icon name="edit" size={12} />
                  Revisar respuestas escritas
                  {live.pendingReviews > 0 && (
                    <span className="ml-0.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-px">{live.pendingReviews}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Avisos de integridad */}
          {live.integrityEvents.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                <Icon name="shield" size={15} />
                Revisá {live.integrityEvents.length === 1 ? 'este aviso' : `estos ${live.integrityEvents.length} avisos`}
              </div>
              <ul className="mt-2 space-y-1.5">
                {live.integrityEvents.map((e) => (
                  <li key={e.id} className="text-xs text-amber-900 dark:text-amber-100 leading-snug">
                    <span className="tabular-nums text-amber-700 dark:text-amber-300">{timeOf(e.createdAt)}</span> ·{' '}
                    {e.kind === 'OTRO_DISPOSITIVO' ? (
                      <>
                        Alguien intentó entrar como <strong>{e.studentDisplayName}</strong> desde otro celular. Se bloqueó: posible
                        suplantación.
                      </>
                    ) : (
                      <>
                        El celular de <strong>{e.otherStudent}</strong> también se usó para <strong>{e.studentDisplayName}</strong>.
                        Puede ser un equipo compartido del aula o alguien respondiendo por otro.
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alumnos en vivo */}
          <div className="bg-card-bg border border-gray-border rounded-2xl">
            <div className="px-5 py-3 border-b border-gray-border flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-text-pri">Alumnos</span>
              <span className="text-[11px] text-text-ter">{rows.length} en la actividad</span>
            </div>
            {rows.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-text-sec">
                {live.status === 'CERRADA' ? 'Nadie respondió esta actividad.' : 'Todavía no entró nadie. Los alumnos van a aparecer acá a medida que escaneen el QR.'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-border max-h-[480px] overflow-y-auto">
                {rows.map((r) => {
                  const idle = r.phase !== 'ENVIADO' && live.status === 'PUBLICADA' && now - Date.parse(r.updatedAt) > IDLE_MS;
                  const total = live.questionCount || 1;
                  return (
                    <li
                      key={r.name}
                      className={`flex items-center gap-3 px-5 py-2.5 transition-colors duration-700 ${highlight === r.name ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                    >
                      <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {r.name.replace('N.º ', '')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-[13px] font-semibold text-text-pri">{r.name}</span>
                          {r.flags.length > 0 && (
                            <span title="Tiene avisos de integridad" className="text-amber-600 dark:text-amber-400">
                              <Icon name="alertTriangle" size={12} />
                            </span>
                          )}
                        </div>
                        {r.phase === 'ENVIADO' ? (
                          r.response && (
                            <div className="flex gap-3 text-[11px] text-text-sec tabular-nums mt-0.5">
                              <span title="Literal">L {pct(r.response.scores.literal)}</span>
                              <span title="Inferencial">I {pct(r.response.scores.inferencial)}</span>
                              <span title="Crítico">
                                C{' '}
                                {r.response.criticoPending ? (
                                  <span className="text-amber-700 dark:text-amber-300 font-semibold">pendiente</span>
                                ) : (
                                  pct(r.response.scores.critico)
                                )}
                              </span>
                            </div>
                          )
                        ) : r.phase === 'RESPONDIENDO' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 w-24 rounded-full bg-gray-bg overflow-hidden">
                              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.round((r.answeredCount / total) * 100)}%` }} />
                            </div>
                            <span className="text-[11px] text-text-sec tabular-nums">
                              {r.answeredCount}/{live.questionCount} · en la {r.currentIndex + 1}.ª
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-sec mt-0.5">Leyendo el texto</div>
                        )}
                      </div>
                      <span
                        className={`hidden sm:inline-flex text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          r.phase === 'ENVIADO'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : idle
                              ? 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300'
                              : r.phase === 'RESPONDIENDO'
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
                                : 'bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300'
                        }`}
                      >
                        {r.phase === 'ENVIADO' ? 'Enviado' : idle ? 'Inactivo' : r.phase === 'RESPONDIENDO' ? 'Respondiendo' : 'Leyendo'}
                      </span>
                      <span className="text-right shrink-0 w-14">
                        <span className="block text-[11px] text-text-ter tabular-nums">{timeOf(r.response?.submittedAt ?? r.updatedAt)}</span>
                        {r.deviceTag && (
                          <span className="block text-[9.5px] font-mono text-text-ter" title="Identificador del celular">
                            {r.deviceTag}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {footer}
        </div>
      </div>

      {/* Modo proyector */}
      {projecting && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center gap-6 p-6" data-keep-white="true" role="dialog" aria-label="QR proyectado">
          <button type="button" onClick={() => setProjecting(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-900 text-sm font-semibold cursor-pointer">
            Salir (Esc)
          </button>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center">{live.name}</div>
          <QrProjector code={live.code} />
          <div className="font-mono text-5xl sm:text-7xl font-bold tracking-[.15em] text-neutral-900">{live.code}</div>
          <div className="text-lg text-neutral-500">
            {window.location.host}/actividad · <span className="font-semibold text-neutral-900">{answered}</span> respondieron
          </div>
        </div>
      )}

      <ReviewAnswersModal activity={reviewOpen ? { id: live.id, name: live.name } : null} isOpen={reviewOpen} onClose={() => setReviewOpen(false)} onReviewed={load} />
      <LiveQuestionsModal
        activityId={live.id}
        activityName={live.name}
        questions={live.questions}
        isOpen={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function QrProjector({ code }: { code: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(joinUrl(code), { margin: 1, width: 900, color: { dark: '#000000', light: '#FFFFFF' } }).then(setSrc);
  }, [code]);
  return src ? (
    <img src={src} alt={`QR de la actividad ${code}`} className="w-[min(70vh,80vw)] h-[min(70vh,80vw)]" />
  ) : (
    <div className="w-[min(70vh,80vw)] h-[min(70vh,80vw)] bg-neutral-100 animate-pulse rounded" />
  );
}
