import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { editLiveQuestion, type LiveQuestion } from '../../../services/activityService';
import { confirmAction, showError } from '../../../lib/alerts';
import { t, useI18n } from '../../../i18n';
import { QuestionFields, QuestionPreview, draftFromQuestion, draftPayload, questionDraftProblem } from './QuestionFields';
import { QUESTION_TYPE_LABEL, questionTypeOf } from '../../../types/question';

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
            aria-label={t('Cerrar')} title={t('Cerrar')}
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
                      {i + 1} · {t(AXIS_LABEL[q.axis])} · {t(QUESTION_TYPE_LABEL[questionTypeOf({ ...q, options: q.options ?? undefined, correctOption: q.correctOption ?? undefined })])}
                    </div>
                    <div className="text-[13px] font-semibold text-text-pri mt-1">{q.prompt}</div>
                    <QuestionPreview {...q} />
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
  onSave: (input: ReturnType<typeof draftPayload>) => Promise<void>;
}) {
  useI18n();
  const [draft, setDraft] = useState(() => draftFromQuestion(question));
  const [saving, setSaving] = useState(false);
  const problem = questionDraftProblem(draft);
  const valid = problem === null;

  async function save() {
    const ok = await confirmAction({
      title: t('¿Guardar la pregunta corregida?'),
      text: t('Los alumnos la ven cambiada al instante. Si ya hay respuestas enviadas, se vuelven a corregir con esta versión.'),
      confirmButtonText: t('Guardar y enviar'),
    });
    if (!ok) return;
    setSaving(true);
    try {
      await onSave(draftPayload(draft));
    } catch (err) {
      showError(t('No se pudo guardar'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-emerald-500/60 rounded-xl p-4 space-y-3 bg-emerald-50/40 dark:bg-emerald-500/5">
      <div className="text-[10.5px] font-bold text-text-ter uppercase tracking-wider">{t('Pregunta {value}', { value: index + 1 })}</div>
      <QuestionFields draft={draft} onChange={setDraft} idPrefix={question.id} />
      {problem && <p className="text-[11px] text-red">{problem}</p>}
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
