import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { HabitarLoader } from '../ui/HabitarLoader';
import { StudentQrScannerModal } from './StudentQrScannerModal';
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
    // no-op
  }
}

function clearDraft(code: string): void {
  try {
    window.localStorage.removeItem(draftKey(code));
  } catch {
    // no-op
  }
}

export function ActivityScreen({ defaultCode }: ActivityScreenProps) {
  const queryCode = useQueryParam('code', defaultCode);
  const [currentCode, setCurrentCode] = useState(queryCode);
  const [pinInput, setPinInput] = useState(queryCode);
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  function handleCodeScanned(code: string, type: 'activity' | 'course' | 'url') {
    if (type === 'course') {
      window.location.href = `/aula?code=${encodeURIComponent(code)}`;
      return;
    }
    setPinInput(code);
    loadActivity(code);
  }

  // Guardar preferencia de "Soy Alumno" en PWA y recuperar nombre anterior si existe
  useEffect(() => {
    try {
      localStorage.setItem('habitar_user_role', 'alumno');
      const savedName = localStorage.getItem('habitar_student_name');
      if (savedName && !name) {
        setName(savedName);
      }
    } catch {
      // no-op
    }
  }, []);

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

  function loadActivity(codeToLoad: string) {
    const cleanCode = codeToLoad.trim().toUpperCase();
    if (!cleanCode) {
      setStage('not-found');
      return;
    }
    setStage('loading');
    getActivityByCode(cleanCode).then((result) => {
      if (!result) {
        setStage('not-found');
        return;
      }
      setCurrentCode(cleanCode);
      setActivity(result.activity);
      setQuestions(result.questions.filter((q) => q.options && q.options.length > 0));

      const draft = loadDraft(cleanCode);
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
  }

  useEffect(() => {
    loadActivity(queryCode);
  }, [queryCode]);

  useEffect(() => {
    if (stage !== 'answering' || !name) return;
    saveDraft(currentCode, { name, index, answers, savedAt: new Date().toISOString() });
  }, [currentCode, stage, name, index, answers]);

  async function handleJoin() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      localStorage.setItem('habitar_student_name', trimmedName);
    } catch {
      // no-op
    }
    setJoining(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setJoining(false);
    setStage('answering');
  }

  function handleSwitchToTeacher() {
    try {
      localStorage.removeItem('habitar_user_role');
    } catch {
      // no-op
    }
    window.location.href = '/login?switch=1';
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
      const payload = questions.map((q) => ({ questionId: q.id, selectedOption: answers[q.id] }));
      try {
        await submitResponse(currentCode, name, payload);
        clearDraft(currentCode);
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

  // Barra superior de modo alumno PWA
  const studentBar = (
    <div className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-md border-b border-gray-border/70 px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-text-sec">
        <span className="text-sm">🎒</span>
        <span className="font-semibold text-text-pri">Modo Alumno</span>
        <span className="hidden sm:inline text-text-ter">· Guardado en este dispositivo</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsScannerOpen(true)}
          type="button"
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
          title="Escanear código QR"
        >
          <Icon name="camera" size={12} />
          <span>Escanear QR</span>
        </button>
        <button
          onClick={handleSwitchToTeacher}
          type="button"
          className="text-[11px] font-medium text-text-sec hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
        >
          ¿Sos docente?
        </button>
      </div>
    </div>
  );

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 pt-10">
        {studentBar}
        <HabitarLoader size="lg" message={`Cargando actividad ${currentCode}...`} />
      </div>
    );
  }

  if (stage === 'not-found' || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-12">
        {studentBar}
        <Card className="w-full max-w-sm text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-2xl">
            🎒
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-pri">Portal del Alumno</h1>
            <p className="text-xs text-text-sec mt-1">
              Ingresá el código PIN que te dio tu docente o el código del aula para resolver la actividad.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadActivity(pinInput);
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="Ej: HAB-4B29"
                className="w-full px-4 py-2.5 border border-gray-border rounded-xl text-center font-mono font-bold tracking-widest text-base uppercase bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!pinInput.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Buscar Actividad
            </button>
          </form>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-[10.5px] font-semibold text-text-ter uppercase">O también</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-600/70 hover:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          >
            <Icon name="camera" size={16} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Escanear Código QR con Cámara</span>
          </button>

          {currentCode && (
            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5">
              No encontramos una actividad activa con el código <strong>{currentCode}</strong>. Verificá si está bien escrito o escaneá el QR del aula.
            </div>
          )}
        </Card>
        <StudentQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCodeScanned={handleCodeScanned}
        />
      </div>
    );
  }

  if (stage === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-12">
        {studentBar}
        <Card className="w-full max-w-sm p-6">
          <div className="text-center mb-5">
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">Habitar</div>
            <div className="text-base font-semibold text-text-pri">¡Hola! ¿Cómo te llamás?</div>
            <div className="text-xs text-text-sec mt-0.5">No necesitás cuenta ni contraseña</div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-border rounded-xl text-sm text-center mb-3 bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
            placeholder="Nombre o nº de lista"
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {joining ? 'Ingresando…' : 'Comenzar actividad'}
          </button>
          <div className="text-center text-[11px] text-text-ter mt-4 pt-3 border-t border-gray-border/60">
            <span className="font-semibold text-text-sec">{activity.name}</span>
            <br />
            Código: <span className="font-mono">{currentCode}</span>
            {activity.endTime && <> · Disponible hasta {activity.endTime} hs</>}
          </div>
        </Card>
      </div>
    );
  }

  if (stage === 'submitted') {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-12">
        {studentBar}
        <Card className="w-full max-w-sm text-center p-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={26} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-text-pri mb-1">¡Actividad enviada!</div>
          <div className="text-xs text-text-sec mb-4">Tus respuestas fueron registradas correctamente.</div>
          <Card surface className="p-3">
            <div className="text-[11px] text-text-ter">{answeredCount} de {questions.length} preguntas respondidas</div>
            <div className="text-[11px] text-text-sec font-medium mt-0.5">{activity.name}</div>
          </Card>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => setIsScannerOpen(true)}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-600/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <Icon name="camera" size={14} />
              <span>Escanear otro código QR</span>
            </button>
            <button
              onClick={() => {
                setStage('not-found');
                setPinInput('');
              }}
              type="button"
              className="text-xs font-semibold text-text-sec hover:text-text-pri hover:underline cursor-pointer py-1"
            >
              Ingresar otro código con PIN
            </button>
          </div>
        </Card>
        <StudentQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCodeScanned={handleCodeScanned}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {studentBar}
      <Card className="w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{activity.name}</div>
          <div className="text-xs text-text-ter font-medium">{name}</div>
        </div>
        <Card surface className="mb-4 max-h-[140px] overflow-y-auto p-3">
          <div className="text-[10px] font-bold text-text-ter uppercase tracking-wider mb-1">TEXTO DE LECTURA</div>
          <div className="text-[12.5px] text-text-pri leading-relaxed">{activity.sourceText}</div>
        </Card>
        {resumed && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-2.5 py-1.5 mb-3">
            <Icon name="refresh" size={11} />
            Retomaste la actividad donde la habías dejado
          </div>
        )}
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-sec bg-surface rounded-lg px-2.5 py-1.5 mb-3">
            <Icon name="alertTriangle" size={11} />
            Sin conexión — tus respuestas se siguen guardando en este dispositivo
          </div>
        )}
        {submitError && (
          <div className="text-[11px] text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg px-2.5 py-1.5 mb-3">{submitError}</div>
        )}
        <div className="text-[11px] text-text-ter mb-1.5">Pregunta {index + 1} de {questions.length}</div>
        <div className="text-sm font-medium text-text-pri mb-3 leading-snug">{currentQuestion.prompt}</div>
        <div className="flex flex-col gap-2 mb-4">
          {currentQuestion.options?.map((option) => {
            const selected = answers[currentQuestion.id] === option;
            return (
              <label
                key={option}
                className={`flex items-center gap-2.5 text-[12.5px] rounded-xl p-3 border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/70 text-emerald-900 dark:text-emerald-200 font-medium'
                    : 'bg-surface border-gray-border/70 hover:border-gray-border text-text-pri'
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  checked={selected}
                  onChange={() => selectOption(option)}
                  className="accent-emerald-600"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-text-ter">Guardado automáticamente</span>
          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id] || submitting}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {submitting ? 'Enviando…' : isLast ? 'Enviar respuestas' : 'Siguiente'}
            <Icon name="arrowRight" size={13} />
          </button>
        </div>
      </Card>
      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleCodeScanned}
      />
    </div>
  );
}
