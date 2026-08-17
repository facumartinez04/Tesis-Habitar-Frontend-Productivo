import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { getActivityByCode, submitResponse } from '../../../services/activityService';
import type { Activity } from '../../../types/activity';
import type { Question } from '../../../types/question';

interface ActivityScreenProps {
  defaultCode: string;
}

type Stage = 'loading' | 'not-found' | 'join' | 'answering' | 'submitted';

interface ActivityDraft {
  name: string;
  index: number;
  answers: Record<string, string>;
  savedAt: string;
}

function draftKey(code: string): string {
  return `habitar_draft_${code}`;
}

function loadDraft(code: string): ActivityDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(code));
    return raw ? (JSON.parse(raw) as ActivityDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(code: string, draft: ActivityDraft): void {
  try {
    window.localStorage.setItem(draftKey(code), JSON.stringify(draft));
  } catch {

  }
}

function clearDraft(code: string): void {
  try {
    window.localStorage.removeItem(draftKey(code));
  } catch {

  }
}

export function ActivityScreen({ defaultCode }: ActivityScreenProps) {
  const code = useQueryParam('code', defaultCode);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>('loading');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    getActivityByCode(code).then((result) => {
      if (!result) {
        setStage('not-found');
        return;
      }
      setActivity(result.activity);
      setQuestions(result.questions.filter((question) => question.options && question.options.length > 0));

      const draft = loadDraft(code);
      if (draft) {
        setName(draft.name);
        setAnswers(draft.answers);
        setIndex(draft.index);
        setResumed(true);
        setStage('answering');
      } else {
        setStage('join');
      }
    });
  }, [code]);

  useEffect(() => {
    if (stage !== 'answering' || !name) return;
    saveDraft(code, { name, index, answers, savedAt: new Date().toISOString() });
  }, [code, stage, name, index, answers]);

  async function handleJoin() {
    if (!name.trim()) return;
    setJoining(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setJoining(false);
    setStage('answering');
  }

  const currentQuestion = questions[index];
  const isLast = index === questions.length - 1;

  function selectOption(option: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  }

  async function handleNext() {
    if (isLast) {
      setSubmitting(true);
      setSubmitError(null);
      const payload = questions.map((question) => ({ questionId: question.id, selectedOption: answers[question.id] }));
      try {
        await submitResponse(code, name, payload);
        clearDraft(code);
        setStage('submitted');
      } catch {

        setSubmitError('No se pudo enviar. Tus respuestas están guardadas: reintentá cuando tengas conexión.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setIndex((prev) => prev + 1);
  }

  if (stage === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-xs text-text-ter">Cargando actividad…</div>;
  }

  if (stage === 'not-found' || !activity) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <div className="text-lg font-semibold mb-1.5">Actividad no encontrada</div>
          <div className="text-xs text-text-sec">El código {code} no corresponde a una actividad activa.</div>
        </div>
      </div>
    );
  }

  if (stage === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="text-lg font-semibold text-green-dark mb-1">Habitar</div>
            <div className="text-sm font-medium mb-1">¡Hola! ¿Cómo te llamás?</div>
            <div className="text-xs text-text-sec">No necesitás cuenta para comenzar</div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-border rounded-md text-sm text-center mb-3"
            placeholder="Nombre o nº de lista"
          />
          <button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full bg-green-dark text-white py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {joining ? 'Ingresando…' : 'Comenzar actividad'}
          </button>
          <div className="text-center text-[11px] text-text-ter mt-4">
            {activity.name}
            <br />
            Disponible hasta las {activity.endTime} hs
          </div>
        </Card>
      </div>
    );
  }

  if (stage === 'submitted') {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-bg flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={26} className="text-green-mid" />
          </div>
          <div className="text-lg font-semibold mb-1.5">¡Actividad enviada!</div>
          <div className="text-xs text-text-sec mb-4">Tus respuestas fueron registradas correctamente.</div>
          <Card surface>
            <div className="text-[11px] text-text-ter">{answeredCount} de {questions.length} preguntas respondidas</div>
            <div className="text-[11px] text-text-ter mt-0.5">{activity.name}</div>
          </Card>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-semibold text-green-dark">{activity.name}</div>
          <div className="text-xs text-text-ter">{name}</div>
        </div>
        <Card surface className="mb-4 max-h-[120px] overflow-y-auto">
          <div className="text-[10px] font-semibold text-text-ter mb-1">TEXTO</div>
          <div className="text-[12px] text-text-pri leading-relaxed">{activity.sourceText}</div>
        </Card>
        {resumed && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber bg-amber-bg rounded-md px-2.5 py-1.5 mb-3">
            <Icon name="refresh" size={11} />
            Retomaste la actividad donde la habías dejado
          </div>
        )}
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec bg-surface rounded-md px-2.5 py-1.5 mb-3">
            <Icon name="alertTriangle" size={11} />
            Sin conexión — tus respuestas se siguen guardando en este dispositivo
          </div>
        )}
        {submitError && (
          <div className="text-[11px] text-red bg-red-bg rounded-md px-2.5 py-1.5 mb-3">{submitError}</div>
        )}
        <div className="text-[11px] text-text-ter mb-1.5">Pregunta {index + 1} de {questions.length}</div>
        <div className="text-sm font-medium mb-3">{currentQuestion.prompt}</div>
        <div className="flex flex-col gap-2 mb-4">
          {currentQuestion.options?.map((option) => {
            const selected = answers[currentQuestion.id] === option;
            return (
              <label
                key={option}
                className={`flex items-center gap-2 text-[12.5px] rounded-md p-2.5 cursor-pointer ${
                  selected ? 'bg-green-bg text-green-text font-medium' : 'bg-surface'
                }`}
              >
                <input type="radio" name={currentQuestion.id} checked={selected} onChange={() => selectOption(option)} />
                {option}
              </label>
            );
          })}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-text-ter">Guardado automáticamente</span>
          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id] || submitting}
            className="flex items-center gap-1.5 bg-green-dark text-white text-xs px-4 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : isLast ? 'Enviar' : 'Siguiente'}
            <Icon name="arrowRight" size={13} />
          </button>
        </div>
      </Card>
    </div>
  );
}
