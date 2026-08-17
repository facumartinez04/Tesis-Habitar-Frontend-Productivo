import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { activityWizardStore, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis } from '../../../../types/activity';

const axisBadge: Record<ComprehensionAxis, { label: string; color: 'blue' | 'teal' | 'amber' }> = {
  literal: { label: 'Literal', color: 'blue' },
  inferencial: { label: 'Inferencial', color: 'teal' },
  critico: { label: 'Crítico', color: 'amber' },
};

export function ReviewQuestionsStep() {
  const wizard = useStore(activityWizardStore);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

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

  function startEdit(id: string, currentPrompt: string) {
    setEditingId(id);
    setDraft(currentPrompt);
  }

  function saveEdit(id: string) {
    updateWizard({
      questions: wizard.questions.map((q) => (q.id === id ? { ...q, prompt: draft, edited: true } : q)),
    });
    setEditingId(null);
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
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Revisá las preguntas generadas</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">
        La IA generó {wizard.questions.length} preguntas. Podés editarlas, eliminarlas o aprobarlas.
      </div>

      <Stepper
        steps={[
          { label: 'Texto', state: 'done' },
          { label: 'Revisar', state: 'current' },
          { label: 'Configurar', state: 'pending' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      <div className="flex gap-1.5 flex-wrap mb-3">
        <Chip>Inferencial <strong className="text-green-mid">{counts.inferencial}</strong></Chip>
        <Chip>Literal <strong className="text-blue">{counts.literal}</strong></Chip>
        <Chip>Crítico <strong className="text-amber-text">{counts.critico}</strong></Chip>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {wizard.questions.map((question) => (
          <Card key={question.id} className={`flex flex-col sm:flex-row gap-3 sm:items-start ${question.approved ? 'border-green-mid' : ''}`}>
            <div className="flex-1">
              <Badge color={axisBadge[question.axis].color} className="mb-1.5">{axisBadge[question.axis].label}</Badge>
              {question.edited && (
                <span className="inline-flex items-center gap-1 text-[10.5px] text-green-mid ml-1.5">
                  <Icon name="edit" size={11} />
                  editada
                </span>
              )}
              {editingId === question.id ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full mt-1 border border-gray-border rounded-[6px] px-2.5 py-1.5 text-[13px]"
                  rows={2}
                />
              ) : (
                <div className="text-[13px] font-medium mb-1">{question.prompt}</div>
              )}
              <div className="text-[11.5px] text-text-sec">Resp. esperada: {question.expectedAnswer}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:shrink-0">
              {editingId === question.id ? (
                <button onClick={() => saveEdit(question.id)} className="bg-green-dark text-white rounded-[6px] px-2.5 py-1.5 text-xs">
                  Guardar
                </button>
              ) : (
                <button onClick={() => startEdit(question.id, question.prompt)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs">
                  Editar
                </button>
              )}
              {!question.approved && (
                <button onClick={() => approveQuestion(question.id)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-green-dark">
                  Aprobar
                </button>
              )}
              <button onClick={() => removeQuestion(question.id)} className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-red-text">
                Eliminar
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5">
        <div className="text-[11.5px] text-text-sec">
          {wizard.questions.length} preguntas · {approvedCount} aprobadas · {wizard.questions.length - approvedCount} pendientes
        </div>
        <button
          onClick={handleContinue}
          disabled={wizard.questions.length === 0}
          className="flex items-center gap-1.5 bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          Aprobar y continuar
          <Icon name="arrowRight" size={13} />
        </button>
      </div>
    </div>
  );
}
