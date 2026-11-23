import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { HabitarLoader } from '../ui/HabitarLoader';
import { getResponseDetail, type ResponseDetail, type ResponseDetailQuestion } from '../../../services/activityService';
import { QUESTION_TYPE_LABEL } from '../../../types/question';
import { t, useI18n } from '../../../i18n';

interface StudentAnswersModalProps {
  activityId: string;
  responseId: string;
  studentName: string;
  onClose: () => void;
}

const AXIS: Record<ResponseDetailQuestion['axis'], { label: string; color: 'blue' | 'teal' | 'amber' }> = {
  LITERAL: { label: 'Literal', color: 'blue' },
  INFERENCIAL: { label: 'Inferencial', color: 'teal' },
  CRITICO: { label: 'Crítico', color: 'amber' },
};

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);

/** Resultado de una pregunta: cerrada (correcta, incorrecta, parcial) o abierta (puntaje o pendiente). */
function Result({ q }: { q: ResponseDetailQuestion }) {
  const answered = q.selectedOption !== null || (q.selectedOptions?.length ?? 0) > 0 || Boolean(q.textAnswer);
  if (q.correct === null) {
    if (!q.textAnswer) return <Badge color="gray">{t('Sin responder')}</Badge>;
    if (q.score !== null && q.reviewed) return <Badge color="green">{t('Puntaje {score} de 3', { score: q.score })}</Badge>;
    return <Badge color="amber">{t('Pendiente de revisión')}</Badge>;
  }
  if (!answered) return <Badge color="gray">{t('Sin responder')}</Badge>;
  if (q.correct) return <Badge color="green">✓ {t('Correcta')}</Badge>;
  if (q.partial !== null) return <Badge color="amber">{t('Parcial: {partial}%', { partial: q.partial })}</Badge>;
  return <Badge color="red">✗ {t('Incorrecta')}</Badge>;
}

function Answer({ q }: { q: ResponseDetailQuestion }) {
  const none = <span className="text-text-ter italic">{t('No respondió')}</span>;

  if (q.type === 'OPCION_UNICA' || q.type === 'VERDADERO_FALSO' || q.type === 'OPCION_MULTIPLE') {
    const multi = q.type === 'OPCION_MULTIPLE';
    const chosen = new Set(multi ? q.selectedOptions ?? [] : q.selectedOption ? [q.selectedOption] : []);
    const correct = new Set(multi ? q.correctOptions ?? [] : q.correctOption ? [q.correctOption] : []);
    if (chosen.size === 0 && !(q.options ?? []).length) return <div className="text-xs">{none}</div>;
    return (
      <ul className="space-y-1">
        {(q.options ?? []).map((option) => {
          const picked = chosen.has(option);
          const right = correct.has(option);
          const tone =
            picked && right
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
              : picked
                ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200'
                : right
                  ? 'border-emerald-300 border-dashed text-emerald-800 dark:text-emerald-300'
                  : 'border-gray-border/60 text-text-sec';
          return (
            <li key={option} className={`flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs ${tone}`}>
              <span className="w-4 shrink-0 font-bold" aria-hidden="true">
                {picked && right ? '✓' : picked ? '✗' : right ? '•' : ''}
              </span>
              <span className="flex-1">{option}</span>
              {picked && <span className="shrink-0 text-[10.5px] font-semibold">{t('Eligió')}</span>}
              {!picked && right && <span className="shrink-0 text-[10.5px] font-semibold">{t('Era la correcta')}</span>}
            </li>
          );
        })}
        {chosen.size === 0 && <li className="text-xs">{none}</li>}
      </ul>
    );
  }

  if (q.type === 'COMPLETAR') {
    return (
      <div className="text-xs space-y-1">
        <div>
          <span className="text-text-sec">{t('Respondió:')}</span>{' '}
          {q.textAnswer ? <strong className="text-text-pri">{q.textAnswer}</strong> : none}
        </div>
        {q.correct === false && (q.acceptedAnswers ?? []).length > 0 && (
          <div className="text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">{(q.acceptedAnswers ?? []).length > 1 ? t('Respuestas aceptadas:') : t('Respuesta correcta:')}</span> {(q.acceptedAnswers ?? []).join(' · ')}
          </div>
        )}
      </div>
    );
  }

  // Abierta: lo que escribió, la sugerencia de la IA y la nota de la docente.
  return (
    <div className="space-y-2 text-xs">
      {q.textAnswer ? (
        <blockquote className="rounded-lg border border-gray-border/60 bg-gray-50 dark:bg-white/5 px-3 py-2 text-text-pri whitespace-pre-wrap">{q.textAnswer}</blockquote>
      ) : (
        <div>{none}</div>
      )}
      {q.textAnswer && q.aiScore !== null && (
        <div className="text-text-sec">
          <span className="font-semibold">{t('La IA sugiere {score} de 3.', { score: q.aiScore })}</span> {q.aiRationale}
        </div>
      )}
      {q.textAnswer && q.reviewed && q.teacherScore !== null && (
        <div className="text-emerald-800 dark:text-emerald-300 font-semibold">{t('Tu puntaje: {score} de 3.', { score: q.teacherScore })}</div>
      )}
    </div>
  );
}

/** Qué respondió un alumno en cada pregunta y si está bien (para la docente). */
export function StudentAnswersModal({ activityId, responseId, studentName, onClose }: StudentAnswersModalProps) {
  useI18n();
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    getResponseDetail(activityId, responseId)
      .then((result) => !cancelled && setDetail(result))
      .catch((err: Error) => !cancelled && setError(err.message || t('No se pudieron cargar las respuestas.')));
    return () => {
      cancelled = true;
    };
  }, [activityId, responseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = detail?.summary;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={t('Respuestas de {name}', { name: studentName })}>
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[92vh]">
        <div className="px-5 sm:px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text-pri truncate">{studentName}</h2>
            {detail && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {s && s.closed > 0 && (
                  <Badge color={s.correct === s.closed ? 'green' : s.correct === 0 ? 'red' : 'amber'}>{t('{correct} de {closed} correctas', { correct: s.correct, closed: s.closed })}</Badge>
                )}
                {s && s.partial > 0 && <Badge color="amber">{t('{n} parciales', { n: s.partial })}</Badge>}
                {s && s.open > 0 && (
                  <Badge color={s.openPending > 0 ? 'amber' : 'green'}>
                    {s.openPending > 0 ? t('{open} abiertas · {pending} sin revisar', { open: s.open, pending: s.openPending }) : t('{open} abiertas revisadas', { open: s.open })}
                  </Badge>
                )}
                <span className="text-[11px] text-text-sec tabular-nums">
                  L {pct(detail.scores.literal)} · I {pct(detail.scores.inferencial)} · C {detail.scores.criticoPending ? t('pendiente') : pct(detail.scores.critico)}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label={t('Cerrar')} title={t('Cerrar')} className="text-text-ter hover:text-text-pri p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer shrink-0">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {error ? (
            <div className="text-sm text-red text-center py-10">{error}</div>
          ) : !detail ? (
            <div className="py-12 flex justify-center">
              <HabitarLoader size="md" message={t('Cargando respuestas...')} />
            </div>
          ) : detail.questions.length === 0 ? (
            <div className="text-center py-10 text-sm text-text-sec">{t('Esta actividad no tiene preguntas.')}</div>
          ) : (
            detail.questions.map((q, i) => (
              <section key={i} className="rounded-xl border border-gray-border/70 dark:border-[#2D3342] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-text-ter">{i + 1}.</span>
                    <Badge color={AXIS[q.axis].color}>{t(AXIS[q.axis].label)}</Badge>
                    <Badge color="gray">{t(QUESTION_TYPE_LABEL[q.type])}</Badge>
                  </div>
                  <Result q={q} />
                </div>
                <div className="text-[13px] font-medium text-text-pri">{q.prompt}</div>
                <Answer q={q} />
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
