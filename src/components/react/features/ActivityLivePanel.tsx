import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../ui/Icon';
import { QrBox } from '../ui/QrBox';
import { HabitarLoader } from '../ui/HabitarLoader';
import { ReviewAnswersModal } from './ReviewAnswersModal';
import { closeActivityNow, getActivityLive, publishActivityNow, type LiveActivity } from '../../../services/activityService';
import { useLiveUpdates, usePolling } from '../../../lib/realtime';
import { confirmAction, showError } from '../../../lib/alerts';
import { pct } from '../../../lib/scores';

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
  const [highlight, setHighlight] = useState<string | null>(null);

  const load = useCallback(() => {
    getActivityLive(activityId)
      .then((data) => {
        setLive((prev) => {
          // Resalta por un momento la respuesta que acaba de llegar.
          if (prev && data.responses.length > prev.responses.length) setHighlight(data.responses[0]?.responseId ?? null);
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
  const answered = live.responses.length;
  const expected = Math.max(live.devicesInClassroom, answered);

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

  async function handleClose() {
    const ok = await confirmAction({
      title: '¿Cerrar la actividad?',
      text: 'Los alumnos ya no van a poder responder y el texto se borra de Habitar. Los resultados se conservan.',
      confirmButtonText: 'Cerrar',
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
                  {live.status === 'PROGRAMADA' ? 'Empieza en' : live.status === 'PUBLICADA' ? 'Cierra en' : 'Estado'}
                </div>
                <div className="text-3xl font-bold text-text-pri tabular-nums mt-1">
                  {live.status === 'PROGRAMADA' ? formatCountdown(opensIn) : live.status === 'PUBLICADA' ? (live.closesAt ? formatCountdown(closesIn) : '—') : 'Cerrada'}
                </div>
                <div className="text-xs text-text-sec mt-1">
                  {live.availableFrom.split('-').reverse().join('/')} · {live.startTime} a {live.endTime} h
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-text-ter uppercase tracking-wider">Respondieron</div>
                <div className="text-3xl font-bold text-text-pri tabular-nums mt-1">
                  {answered}
                  {expected > 0 && <span className="text-base font-semibold text-text-ter"> / {expected}</span>}
                </div>
                <div className="h-1.5 rounded-full bg-gray-bg mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${expected ? Math.round((answered / expected) * 100) : 0}%` }} />
                </div>
                <div className="text-xs text-text-sec mt-1">
                  {live.devicesInClassroom} {live.devicesInClassroom === 1 ? 'dispositivo vinculado' : 'dispositivos vinculados'} en el aula
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {live.status === 'PROGRAMADA' && (
                <button type="button" disabled={busy} onClick={handlePublish} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer">
                  Abrir ahora
                </button>
              )}
              {live.status === 'PUBLICADA' && (
                <button type="button" disabled={busy} onClick={handleClose} className="border border-gray-border text-text-pri hover:bg-gray-50 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer">
                  Cerrar actividad
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

          {/* Respuestas en vivo */}
          <div className="bg-card-bg border border-gray-border rounded-2xl">
            <div className="px-5 py-3 border-b border-gray-border text-sm font-bold text-text-pri">Respuestas</div>
            {answered === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-text-sec">
                {live.status === 'CERRADA' ? 'Nadie respondió esta actividad.' : 'Todavía no llegó ninguna respuesta. Van a aparecer acá solas.'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-border max-h-[420px] overflow-y-auto">
                {live.responses.map((r) => (
                  <li
                    key={r.responseId}
                    className={`flex items-center gap-3 px-5 py-2.5 transition-colors duration-700 ${highlight === r.responseId ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                  >
                    <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {r.studentDisplayName.replace('N.º ', '')}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-text-pri">{r.studentDisplayName}</span>
                    <span className="hidden sm:flex gap-3 text-[11px] text-text-sec tabular-nums">
                      <span title="Literal">L {pct(r.scores.literal)}</span>
                      <span title="Inferencial">I {pct(r.scores.inferencial)}</span>
                      <span title="Crítico">C {r.criticoPending ? <span className="text-amber-700 dark:text-amber-300 font-semibold">pendiente</span> : pct(r.scores.critico)}</span>
                    </span>
                    <span className="text-[11px] text-text-ter tabular-nums w-11 text-right">{timeOf(r.submittedAt)}</span>
                  </li>
                ))}
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
