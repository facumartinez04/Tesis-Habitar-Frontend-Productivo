import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { activityWizardStore, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis } from '../../../../types/activity';
import { t, useI18n } from '../../../../i18n';
import { QuestionFields, QuestionPreview, draftFromQuestion, draftPayload, questionDraftProblem, type QuestionDraft } from '../QuestionFields';
import { QUESTION_TYPE_LABEL, questionTypeOf } from '../../../../types/question';

const axisBadge: Record<ComprehensionAxis, { label: string; color: 'blue' | 'teal' | 'amber' }> = {
  literal: { label: 'Literal', color: 'blue' },
  inferencial: { label: 'Inferencial', color: 'teal' },
  critico: { label: 'Crítico', color: 'amber' },
};

export function ReviewQuestionsStep() {
  useI18n();
  const wizard = useStore(activityWizardStore);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);

  useEffect(() => {
    if (wizard.questions.length === 0) {
      window.location.href = '/docente/actividades/nueva';
    }
  }, [wizard.questions.length]);

  const counts = useMemo(() => {
    return wizard.questions.reduce(
      (acc, q) => {
        acc[q.axis] += 1;
        return acc;
      },
      { literal: 0, inferencial: 0, critico: 0 } as Record<ComprehensionAxis, number>,
    );
  }, [wizard.questions]);

  const approvedCount = wizard.questions.filter((q) => q.approved).length;

  function startEdit(id: string) {
    const question = wizard.questions.find((q) => q.id === id);
    if (!question) return;
    setEditingId(id);
    setDraft(draftFromQuestion(question));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id: string) {
    if (!draft || questionDraftProblem(draft)) return;
    const payload = draftPayload(draft);
    updateWizard({
      questions: wizard.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              type: draft.type,
              prompt: payload.prompt,
              expectedAnswer: payload.expectedAnswer ?? q.expectedAnswer,
              options: 'options' in payload ? payload.options : undefined,
              correctOption: 'correctOption' in payload ? payload.correctOption : undefined,
              correctOptions: 'correctOptions' in payload ? payload.correctOptions : undefined,
              acceptedAnswers: 'acceptedAnswers' in payload ? payload.acceptedAnswers : undefined,
              edited: true,
            }
          : q,
      ),
    });
    setEditingId(null);
    setDraft(null);
  }

  function removeQuestion(id: string) {
    updateWizard({ questions: wizard.questions.filter((q) => q.id !== id) });
  }

  function approveQuestion(id: string) {
    updateWizard({
      questions: wizard.questions.map((q) => (q.id === id ? { ...q, approved: true } : q)),
    });
  }

  function handleContinue() {
    updateWizard({ questions: wizard.questions.map((q) => ({ ...q, approved: true })) });
    window.location.href = '/docente/actividades/nueva/configurar';
  }

  if (wizard.questions.length === 0) return null;

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{t('Revisá las preguntas generadas')}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        {t('La IA generó {questionsCount} preguntas. Podés editarlas, eliminarlas o aprobarlas.', { questionsCount: wizard.questions.length })}
      </div>

      <Stepper
        steps={[
          { label: t('Texto'), state: 'done' },
          { label: t('Revisar'), state: 'current' },
          { label: t('Configurar'), state: 'pending' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      <div className="flex gap-1.5 flex-wrap mb-3">
        <Chip>{t('Inferencial')}{' '}<strong className="text-green-mid">{counts.inferencial}</strong></Chip>
        <Chip>{t('Literal')}{' '}<strong className="text-blue">{counts.literal}</strong></Chip>
        <Chip>{t('Crítico')}{' '}<strong className="text-amber-text">{counts.critico}</strong></Chip>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {wizard.questions.map((question, index) => {
          const isEditing = editingId === question.id && draft !== null;
          const problem = isEditing && draft ? questionDraftProblem(draft) : null;
          const badges = (
            <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
              <span className="text-[11px] font-semibold text-text-ter">{index + 1}.</span>
              <Badge color={axisBadge[question.axis].color}>{t(axisBadge[question.axis].label)}</Badge>
              <Badge color="gray">{t(QUESTION_TYPE_LABEL[questionTypeOf(question)])}</Badge>
              {question.edited && (
                <span className="inline-flex items-center gap-1 text-[10.5px] text-green-mid">
                  <Icon name="edit" size={11} />
                  {t('editada')}
                </span>
              )}
            </div>
          );
          if (isEditing && draft) {
            // Edición: la tarjeta ocupa todo el ancho y las acciones van abajo, para escribir cómodo.
            return (
              <Card
                key={question.id}
                className="border-emerald-600 ring-2 ring-emerald-600/20"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Escape') cancelEdit();
                }}
              >
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mb-1">{t('Editando la pregunta')}</div>
                {badges}
                <QuestionFields draft={draft} onChange={setDraft} idPrefix={question.id} />
                <div className="mt-4 pt-3 border-t border-gray-border flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => saveEdit(question.id)}
                    disabled={Boolean(problem)}
                    className="bg-green-dark text-white rounded-[6px] px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {t('Guardar cambios')}
                  </button>
                  <button onClick={cancelEdit} className="bg-white border border-gray-border rounded-[6px] px-3 py-1.5 text-xs cursor-pointer">
                    {t('Cancelar')}
                  </button>
                  {problem && <span className="text-[11px] text-red">{problem}</span>}
                  <button
                    onClick={() => {
                      cancelEdit();
                      removeQuestion(question.id);
                    }}
                    className="ml-auto bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-red-text cursor-pointer"
                  >
                    {t('Eliminar')}
                  </button>
                </div>
              </Card>
            );
          }
          return (
            <Card key={question.id} className={`flex flex-col sm:flex-row gap-3 sm:items-start ${question.approved ? 'border-green-mid' : ''}`}>
              <div className="flex-1 min-w-0">
                {badges}
                <div className="text-[13px] font-medium mb-1">{question.prompt}</div>
                <QuestionPreview {...question} />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                <button onClick={() => startEdit(question.id)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs cursor-pointer">
                  {t('Editar')}
                </button>
                {!question.approved && (
                  <button onClick={() => approveQuestion(question.id)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-green-dark cursor-pointer">
                    {t('Aprobar')}
                  </button>
                )}
                <button onClick={() => removeQuestion(question.id)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-red-text cursor-pointer">
                  {t('Eliminar')}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5">
        <div className="text-[11.5px] text-text-sec">
          {t('{questionsCount} preguntas · {approvedCount} aprobadas · {value} pendientes', { questionsCount: wizard.questions.length, approvedCount, value: wizard.questions.length - approvedCount })}
        </div>
        <button
          onClick={handleContinue}
          disabled={wizard.questions.length === 0}
          className="flex items-center gap-1.5 bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {t('Aprobar y continuar')}
          <Icon name="arrowRight" size={13} />
        </button>
      </div>
    </div>
  );
}
