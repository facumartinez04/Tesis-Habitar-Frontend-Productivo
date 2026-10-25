import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { editLiveQuestion, type LiveQuestion } from '../../../services/activityService';
import { confirmAction, showError } from '../../../lib/alerts';
import { t, useI18n } from '../../../i18n';

interface LiveQuestionsModalProps {
  activityId: string;
  activityName: string;
  questions: LiveQuestion[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AXIS_LABEL: Record<LiveQuestion['axis'], string> = {
  LITERAL: 'Literal',
  INFERENCIAL: 'Inferencial',
  CRITICO: 'Crítico',
};

export function LiveQuestionsModal({ activityId, activityName, questions, isOpen, onClose, onSaved }: LiveQuestionsModalProps) {
  useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-label={t('Editar preguntas')}>
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-pri">{t('Editar preguntas')}</h2>
            <p className="text-xs text-text-sec mt-0.5">{activityName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('Cerrar')}
            className="text-text-ter hover:text-text-pri p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-gray-border/60 dark:border-[#2D3342] text-xs text-text-sec leading-relaxed">
          {t('Los alumnos ven el cambio al instante y conservan su respuesta si la opción sigue existiendo. La respuesta correcta nunca llega a sus celulares. Si ya hay envíos, se vuelven a corregir con la versión nueva.')}
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {questions.map((q, i) =>
            editingId === q.id ? (
              <QuestionEditor
                key={q.id}
                index={i}
                question={q}
                onCancel={() => setEditingId(null)}
                onSave={async (input) => {
                  await editLiveQuestion(activityId, q.id, input);
                  setEditingId(null);
                  onSaved();
                }}
              />
            ) : (
              <div key={q.id} className="border border-gray-border dark:border-[#2D3342] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold text-text-ter uppercase tracking-wider">
                      {i + 1} · {t(AXIS_LABEL[q.axis])} · {q.options?.length ? t('opción múltiple') : t('respuesta escrita')}
                    </div>
                    <div className="text-[13px] font-semibold text-text-pri mt-1">{q.prompt}</div>
                    {q.options?.length ? (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((o) => (
                          <li key={o} className={`text-xs flex items-center gap-1.5 ${o === q.correctOption ? 'text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-text-sec'}`}>
                            {o === q.correctOption ? <Icon name="check" size={12} /> : <span className="w-3" />}
                            {o}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-text-sec mt-1.5">
                        <span className="font-semibold">{t('Esperada:')}</span> {q.expectedAnswer}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(q.id)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-text-pri border border-gray-border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Icon name="edit" size={12} />
                    {t('Editar')}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  index,
  question,
  onCancel,
  onSave,
}: {
  index: number;
  question: LiveQuestion;
  onCancel: () => void;
  onSave: (input: { prompt: string; options?: string[]; correctOption?: string; expectedAnswer?: string }) => Promise<void>;
}) {
  useI18n();
  const closed = Boolean(question.options?.length);
  const [prompt, setPrompt] = useState(question.prompt);
  const [options, setOptions] = useState<string[]>(question.options ?? []);
  const [correct, setCorrect] = useState(Math.max(0, (question.options ?? []).indexOf(question.correctOption ?? '')));
  const [expected, setExpected] = useState(question.expectedAnswer);
  const [saving, setSaving] = useState(false);

  const trimmed = options.map((o) => o.trim());
  const valid =
    prompt.trim().length >= 3 &&
    (!closed || (trimmed.every(Boolean) && new Set(trimmed).size === trimmed.length && trimmed.length >= 2));

  async function save() {
    const ok = await confirmAction({
      title: t('¿Guardar la pregunta corregida?'),
      text: t('Los alumnos la ven cambiada al instante. Si ya hay respuestas enviadas, se vuelven a corregir con esta versión.'),
      confirmButtonText: t('Guardar y enviar'),
    });
    if (!ok) return;
    setSaving(true);
    try {
      await onSave(
        closed
          ? { prompt: prompt.trim(), options: trimmed, correctOption: trimmed[correct] }
          : { prompt: prompt.trim(), expectedAnswer: expected.trim() || question.expectedAnswer },
      );
    } catch (err) {
      showError(t('No se pudo guardar'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  const field =
    'w-full px-3 py-2 border border-gray-border dark:border-[#2D3342] rounded-lg text-[13px] bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 outline-none';

  return (
    <div className="border border-emerald-500/60 rounded-xl p-4 space-y-3 bg-emerald-50/40 dark:bg-emerald-500/5">
      <div className="text-[10.5px] font-bold text-text-ter uppercase tracking-wider">{t('Pregunta {value}', { value: index + 1 })}</div>
      <label className="block">
        <span className="block text-[11px] text-text-sec mb-1 font-medium">{t('Consigna')}</span>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className={field} />
      </label>
      {closed ? (
        <fieldset>
          <legend className="block text-[11px] text-text-sec mb-1 font-medium">{t('Opciones (marcá la correcta)')}</legend>
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={correct === i}
                  onChange={() => setCorrect(i)}
                  aria-label={t('Opción {value} es la correcta', { value: i + 1 })}
                  className="accent-emerald-700 w-4 h-4 cursor-pointer"
                />
                <input
                  value={o}
                  onChange={(e) => setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                  className={field}
                />
              </div>
            ))}
          </div>
          {!valid && <p className="text-[11px] text-red mt-1.5">{t('Completá la consigna y opciones distintas entre sí.')}</p>}
        </fieldset>
      ) : (
        <label className="block">
          <span className="block text-[11px] text-text-sec mb-1 font-medium">{t('Respuesta esperada (guía para la corrección)')}</span>
          <textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={3} className={field} />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs font-bold text-text-sec px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer">
          {t('Cancelar')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!valid || saving}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer"
        >
          {saving ? t('Guardando…') : t('Guardar y enviar a los alumnos')}
        </button>
      </div>
    </div>
  );
}
