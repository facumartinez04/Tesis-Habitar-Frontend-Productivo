import { Icon } from '../ui/Icon';
import type { StudentFeedback } from '../../../services/activityService';

const AXIS_LABEL: Record<string, string> = { LITERAL: 'Literal', INFERENCIAL: 'Inferencial', CRITICO: 'Crítico' };

function pct(v: number | null): string {
  return v === null ? '—' : `${v}%`;
}

export function StudentFeedbackView({ feedback, studentName }: { feedback: StudentFeedback; studentName: string }) {
  const s = feedback.scores;
  const closed = feedback.questions.filter((q) => q.correct !== null);
  const right = closed.filter((q) => q.correct).length;

  return (
    <div className="w-full max-w-lg bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 sm:p-7 shadow-md">
      <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tus resultados</div>
          <div className="text-sm font-bold text-emerald-750 dark:text-emerald-400">{feedback.activityName}</div>
        </div>
        <div className="text-xs text-stone-500 font-semibold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full shrink-0">{studentName}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['literal', 'inferencial', 'critico'] as const).map((k) => (
          <div key={k} className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{AXIS_LABEL[k.toUpperCase()]}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {k === 'critico' && s.criticoPending ? <span className="text-xs text-amber-700 dark:text-amber-300">En revisión</span> : pct(s[k])}
            </div>
          </div>
        ))}
      </div>
      {closed.length > 0 && (
        <p className="text-xs text-stone-600 dark:text-stone-300 mb-4">
          Acertaste <strong>{right}</strong> de <strong>{closed.length}</strong> preguntas de opción múltiple.
        </p>
      )}

      <ol className="space-y-3">
        {feedback.questions.map((q, i) => (
          <li key={i} className="border border-stone-200/80 dark:border-stone-700 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Pregunta {i + 1} · {AXIS_LABEL[q.axis] ?? q.axis}
              </div>
              {q.correct !== null && (
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                    q.correct ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300'
                  }`}
                >
                  <Icon name={q.correct ? 'check' : 'close'} size={11} />
                  {q.correct ? 'Correcta' : q.selectedOption ? 'Incorrecta' : 'Sin responder'}
                </span>
              )}
            </div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mt-1">{q.prompt}</div>

            {q.correct !== null ? (
              <ul className="mt-2 space-y-1">
                {(q.options ?? []).map((o) => {
                  const isCorrect = o === q.correctOption;
                  const isMine = o === q.selectedOption;
                  return (
                    <li
                      key={o}
                      className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-semibold'
                          : isMine
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-100'
                            : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <Icon name={isCorrect ? 'check' : isMine ? 'close' : 'minus'} size={12} className={isCorrect || isMine ? '' : 'opacity-30'} />
                      <span className="flex-1">{o}</span>
                      {isMine && <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Tu respuesta</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2 whitespace-pre-line">
                  {q.textAnswer || <span className="italic text-stone-400">No respondiste esta pregunta.</span>}
                </div>
                {q.textAnswer &&
                  (q.pendingReview ? (
                    <div className="flex items-center gap-1.5 text-[11.5px] text-amber-800 dark:text-amber-300">
                      <Icon name="clock" size={12} />
                      Tu docente todavía la está revisando.
                    </div>
                  ) : (
                    q.score !== null && (
                      <div className="text-[11.5px] text-stone-700 dark:text-stone-200">
                        <strong className="tabular-nums">{q.score} de 3</strong> · {q.scoreLabel}
                      </div>
                    )
                  ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
