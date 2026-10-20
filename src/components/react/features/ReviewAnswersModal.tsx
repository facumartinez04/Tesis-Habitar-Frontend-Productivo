import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { HabitarLoader } from '../ui/HabitarLoader';
import { getReviewQueue, reviewAnswer, type ReviewItem, type ReviewQueue } from '../../../services/activityService';
import { showError } from '../../../lib/alerts';

interface ReviewAnswersModalProps {
  activity: { id: string; name: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewed?: () => void;
}

const RUBRIC: { score: number; label: string }[] = [
  { score: 0, label: 'No responde o no se relaciona' },
  { score: 1, label: 'Opina sin fundamentar' },
  { score: 2, label: 'Fundamenta con el texto' },
  { score: 3, label: 'Fundamenta y evalúa el texto' },
];

export function ReviewAnswersModal({ activity, isOpen, onClose, onReviewed }: ReviewAnswersModalProps) {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (!isOpen || !activity) return;
    setLoading(true);
    setChanged(false);
    getReviewQueue(activity.id)
      .then(setQueue)
      .catch((err: Error) => showError('Error', err.message || 'No se pudieron cargar las respuestas.'))
      .finally(() => setLoading(false));
  }, [isOpen, activity?.id]);

  async function handleScore(item: ReviewItem, score: number) {
    if (!activity) return;
    setSavingId(item.answerId);
    try {
      setQueue(await reviewAnswer(activity.id, item.answerId, score));
      setChanged(true);
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : 'Intentá de nuevo.');
    } finally {
      setSavingId(null);
    }
  }

  function handleClose() {
    if (changed) onReviewed?.();
    onClose();
  }

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-pri">Revisar respuestas escritas</h2>
              {queue && (
                <Badge color={queue.pending > 0 ? 'amber' : 'green'}>
                  {queue.pending > 0 ? `${queue.pending} pendientes` : 'Todo revisado'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-sec mt-0.5">{activity.name}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            className="text-text-ter hover:text-text-pri p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-border/60 dark:border-[#2D3342] text-xs text-text-sec leading-relaxed">
          La IA propone un puntaje con la rúbrica de 0 a 3 y explica por qué. El eje crítico del alumno se calcula
          recién cuando confirmás o cambiás el puntaje: hasta entonces figura como <strong>pendiente</strong>.
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center">
              <HabitarLoader size="md" message="Cargando respuestas..." />
            </div>
          ) : !queue || queue.items.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-sec">Esta actividad todavía no tiene respuestas escritas.</div>
          ) : (
            queue.items.map((item) => {
              const reviewed = item.teacherScore !== null;
              return (
                <div
                  key={item.answerId}
                  className={`rounded-xl border p-4 space-y-3 ${reviewed ? 'border-gray-border/60 opacity-80' : 'border-amber-300 dark:border-amber-700/60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-text-pri">{item.studentDisplayName}</div>
                    {reviewed ? (
                      <Badge color="green">Revisada: {item.teacherScore} de 3</Badge>
                    ) : (
                      <Badge color="amber">Pendiente</Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-sec">{item.questionPrompt}</div>
                  <div className="text-[13px] text-text-pri bg-gray-50 dark:bg-[#1A1E29] rounded-lg p-3 whitespace-pre-line leading-relaxed">
                    {item.textAnswer || <span className="italic text-text-ter">Sin respuesta</span>}
                  </div>

                  {item.aiScore !== null ? (
                    <div className="text-xs bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-lg p-3">
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-0.5">
                        Propuesta de la IA: {item.aiScore} de 3 — {RUBRIC[item.aiScore]?.label}
                      </div>
                      {item.aiRationale && <div className="text-emerald-900/80 dark:text-emerald-200/80">{item.aiRationale}</div>}
                    </div>
                  ) : (
                    !reviewed && <div className="text-xs text-text-ter">Sin propuesta de la IA: asigná el puntaje con la rúbrica.</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {RUBRIC.map((r) => {
                      const current = item.teacherScore === r.score;
                      const proposed = item.teacherScore === null && item.aiScore === r.score;
                      return (
                        <button
                          key={r.score}
                          type="button"
                          disabled={savingId === item.answerId}
                          onClick={() => handleScore(item, r.score)}
                          title={r.label}
                          className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors cursor-pointer disabled:opacity-50 ${
                            current
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : proposed
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : 'bg-white dark:bg-[#1A1E29] border-gray-border text-text-pri hover:bg-gray-50'
                          }`}
                        >
                          {proposed ? `Confirmar ${r.score}` : r.score} · {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
