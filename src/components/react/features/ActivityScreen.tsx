import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { HabitarLoader } from '../ui/HabitarLoader';
import { StudentQrScannerModal } from './StudentQrScannerModal';
import { useQueryParam } from '../../../hooks/useQueryParam';
import { getActivityByCode, submitResponse, type AnswerPayload } from '../../../services/activityService';
import { ApiError } from '../../../lib/apiClient';
import { getOrCreateDeviceId, studentIdLabel, type StudentIdMode } from '../../../lib/studentDevice';
import { useLiveUpdates } from '../../../lib/realtime';
import { arInstant, whenLabel } from '../../../lib/activityDates';
import type { Activity } from '../../../types/activity';
import type { Question } from '../../../types/question';

/** Pregunta abierta (eje crítico): se responde con texto, no con opciones. */
function isOpen(question: Question): boolean {
  return !question.options || question.options.length === 0;
}

/** Cierre de la ventana horaria en hora argentina (UTC−3), o null si no es válido. */
function closesAt(activity: Activity): number | null {
  return arInstant(activity.endDate || activity.availableFrom, activity.endTime);
}

interface ActivityScreenProps {
  defaultCode?: string;
}

type Stage = 'loading' | 'not-found' | 'unavailable' | 'join' | 'answering' | 'submitted';

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

export function ActivityScreen({ defaultCode = '' }: ActivityScreenProps) {
  const queryCode = useQueryParam('code', defaultCode);
  const [currentCode, setCurrentCode] = useState(queryCode || '');
  const [pinInput, setPinInput] = useState(queryCode || '');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>(queryCode ? 'loading' : 'not-found');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [studentIdMode, setStudentIdMode] = useState<StudentIdMode>('lista');
  const [unavailableMessage, setUnavailableMessage] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [criticoPending, setCriticoPending] = useState(false);
  const [submittedNote, setSubmittedNote] = useState<string | null>(null);

  function handleCodeScanned(code: string, type: 'activity' | 'course' | 'url') {
    if (type === 'course') {
      window.location.href = `/aula?code=${encodeURIComponent(code)}`;
      return;
    }
    setPinInput(code);
    loadActivity(code);
  }

  useEffect(() => {
    try {
      localStorage.setItem('habitar_user_role', 'alumno');
      const savedName = localStorage.getItem('habitar_student_name');
      if (savedName && !name) {
        setName(savedName);
      }
    } catch {

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
    const raw = (codeToLoad || '').trim();
    if (!raw) {
      setCurrentCode('');
      setStage('not-found');
      return;
    }

    if (raw.includes('/aula') || raw.toUpperCase().startsWith('AULA-')) {
      let code = raw;
      try {
        const url = new URL(raw, window.location.origin);
        code = url.searchParams.get('code') || '';
        if (!code && url.pathname.includes('/aula/')) {
          code = url.pathname.split('/aula/')[1]?.split('/')[0] || '';
        }
      } catch {
        if (raw.includes('code=')) {
          code = raw.split('code=')[1]?.split('&')[0] || '';
        } else if (raw.includes('/aula/')) {
          code = raw.split('/aula/')[1]?.split('?')[0]?.split('/')[0] || '';
        }
      }
      window.location.href = `/aula?code=${encodeURIComponent((code || raw).toUpperCase())}`;
      return;
    }

    let cleanCode = raw.toUpperCase();
    if (raw.includes('/actividad')) {
      try {
        const url = new URL(raw, window.location.origin);
        const extracted = url.searchParams.get('code');
        if (extracted) cleanCode = extracted.toUpperCase();
      } catch {}
    }

    setCurrentCode(cleanCode);
    setStage('loading');
    getActivityByCode(cleanCode).then((result) => {
      if (!result.ok) {
        if (result.notFound) {
          setStage('not-found');
        } else {
          setUnavailableMessage(result.message);
          setStage('unavailable');
        }
        return;
      }
      setActivity(result.activity);
      setStudentIdMode(result.studentIdMode);
      setQuestions(result.questions);

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
    if (studentIdMode === 'lista' && !/^\d{1,3}$/.test(trimmedName.replace(/^(n\.?\s*[º°o]?\.?\s*|#\s*)/i, ''))) {
      setJoinError('Ingresá sólo tu número de lista, por ejemplo 12.');
      return;
    }
    setJoinError(null);
    try {
      localStorage.setItem('habitar_student_name', trimmedName);
    } catch {

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

    }
    window.location.href = '/login?switch=1';
  }

  const currentQuestion = questions[index];
  const isLast = index === questions.length - 1;

  function selectOption(option: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  }

  function buildPayload(): AnswerPayload[] {
    return questions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== '')
      .map((q) => (isOpen(q) ? { questionId: q.id, textAnswer: answers[q.id] } : { questionId: q.id, selectedOption: answers[q.id] }));
  }

  async function submitAll(automatic: boolean) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitResponse(currentCode, name, getOrCreateDeviceId(), buildPayload());
      clearDraft(currentCode);
      setCriticoPending(result.criticoPending);
      setSubmittedNote(automatic ? 'El tiempo de la actividad terminó: enviamos las respuestas que tenías.' : null);
      setStage('submitted');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.message.startsWith('Ya enviaste')) {
        clearDraft(currentCode);
        setSubmittedNote(err.message);
        setStage('submitted');
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setSubmitError(err.message);
      } else {
        setSubmitError('No se pudo enviar. Tus respuestas están guardadas: reintentá cuando tengas conexión.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // El temporizador de cierre llama siempre a la versión más reciente, con las respuestas actuales.
  const submitRef = useRef(submitAll);
  submitRef.current = submitAll;

  async function handleNext() {
    if (isLast) {
      await submitAll(false);
      return;
    }
    setIndex((prev) => prev + 1);
  }

  // Avisos en vivo de la actividad: el docente la abre o la cierra y la pantalla reacciona sin recargar.
  useLiveUpdates(currentCode && stage !== 'not-found' && stage !== 'submitted' ? { kind: 'activity', code: currentCode } : null, (payload) => {
    const status = payload?.status;
    if (status === 'CERRADA' && stage === 'answering') {
      void submitRef.current(true);
    } else if (status === 'CERRADA' && stage === 'join') {
      setUnavailableMessage('[Error-REA_001] La actividad ya no está disponible');
      setStage('unavailable');
    } else if (status === 'PUBLICADA' && stage === 'unavailable') {
      loadActivity(currentCode);
    }
  });

  // Si la ventana horaria vence mientras el alumno responde, se envían sus respuestas parciales (CU-02-06, 2.1).
  useEffect(() => {
    if (stage !== 'answering' || !activity) return;
    const end = closesAt(activity);
    if (end === null) return;
    const wait = end - Date.now();
    const timer = window.setTimeout(() => {
      void submitRef.current(true);
    }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
  }, [stage, activity]);

  const studentBar = (
    <div className="fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-[#161A24]/90 backdrop-blur-md border-b border-stone-200/80 px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
        <span className="text-base">🎒</span>
        <span className="font-bold text-slate-900 dark:text-white">Modo Alumno</span>
        <span className="hidden sm:inline text-stone-400">· Guardado automático local</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsScannerOpen(true)}
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-850 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
          title="Escanear código QR de clase"
        >
          <Icon name="camera" size={13} />
          <span>Escanear QR</span>
        </button>
        <button
          onClick={handleSwitchToTeacher}
          type="button"
          className="text-xs font-semibold text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer px-2 py-1 rounded-lg"
        >
          ¿Sos docente?
        </button>
      </div>
    </div>
  );

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 pt-12 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <HabitarLoader size="lg" message="Cargando tu actividad de lectura..." />
      </div>
    );
  }

  if (stage === 'not-found' || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-2xl shadow-2xs">
            🎒
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Portal del Alumno</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Ingresá el código PIN que te dio tu docente o escaneá el QR del aula para resolver la actividad.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadActivity(pinInput);
            }}
            className="space-y-3 pt-1"
          >
            <div>
              <input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="Ej: HAB-4B29"
                className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-center font-mono font-bold tracking-widest text-lg uppercase bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={!pinInput.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Buscar Actividad
            </button>
          </form>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">O también</span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          >
            <Icon name="camera" size={16} className="text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Escanear Código QR con Cámara</span>
          </button>

          {currentCode && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl p-3 text-center leading-snug">
              No encontramos una actividad activa con el código <strong>{currentCode}</strong>. Verificá si está bien escrito o escaneá el QR del aula.
            </div>
          )}
        </div>
        <StudentQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCodeScanned={handleCodeScanned}
        />
      </div>
    );
  }

  if (stage === 'unavailable') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3">
          <Icon name="clock" size={28} className="mx-auto text-amber-700" />
          <div className="text-base font-bold text-slate-900 dark:text-white">{unavailableMessage}</div>
          <p className="text-xs text-stone-500">Consultá a tu docente si la actividad sigue abierta.</p>
          <button
            type="button"
            onClick={() => {
              setStage('not-found');
              setCurrentCode('');
              setPinInput('');
            }}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Ingresar otro código
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'join') {
    const label = studentIdLabel(studentIdMode);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md">
          <div className="text-center mb-5">
            <div className="text-base font-extrabold text-emerald-750 dark:text-emerald-400 mb-0.5">Habitar</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{label.title}</div>
            <div className="text-xs text-stone-500 mt-0.5">{label.hint}</div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputMode={studentIdMode === 'lista' ? 'numeric' : 'text'}
            maxLength={studentIdMode === 'lista' ? 6 : 80}
            className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-center mb-2 bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white font-medium focus:border-emerald-600 focus:bg-white outline-none shadow-inner"
            placeholder={label.placeholder}
            autoFocus
          />
          {joinError && <div className="text-xs text-rose-700 text-center mb-2">{joinError}</div>}
          <div className="mb-2" />
          <button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            {joining ? 'Ingresando…' : 'Comenzar actividad de lectura'}
          </button>
          <div className="text-center text-[11px] text-stone-500 mt-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <span className="font-bold text-slate-800 dark:text-slate-200">{activity.name}</span>
            <br />
            Código: <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">{currentCode}</span>
            {activity.endTime && <> · Disponible hasta {whenLabel(activity.endDate || activity.availableFrom, activity.endTime)}</>}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'submitted') {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 text-center shadow-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Icon name="check" size={32} className="text-emerald-700 dark:text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">¡Actividad enviada!</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5">
            {submittedNote ?? 'Tus respuestas quedaron registradas.'}
            {criticoPending && ' Tu docente va a revisar tus respuestas escritas.'}
          </p>
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-700">
            <div className="text-xs text-stone-500">{answeredCount} de {questions.length} preguntas respondidas</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{activity.name}</div>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            <button
              onClick={() => setIsScannerOpen(true)}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
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
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-slate-900 hover:underline cursor-pointer py-1.5"
            >
              Ingresar otro código PIN
            </button>
          </div>
        </div>
        <StudentQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCodeScanned={handleCodeScanned}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
      {studentBar}
      <div className="w-full max-w-lg bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="text-sm font-bold text-emerald-750 dark:text-emerald-400">{activity.name}</div>
          <div className="text-xs text-stone-500 font-semibold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">{name}</div>
        </div>

        <div className="mb-5 max-h-[160px] overflow-y-auto p-3.5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 rounded-xl">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">TEXTO DE LECTURA</div>
          <div className="text-xs sm:text-[13px] text-slate-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">{activity.sourceText}</div>
        </div>

        {resumed && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            <Icon name="refresh" size={13} />
            Retomaste la actividad donde la habías dejado
          </div>
        )}

        {!isOnline && (
          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 rounded-xl px-3 py-2 mb-3">
            <Icon name="alertTriangle" size={13} />
            Sin conexión — tus respuestas se siguen guardando en este dispositivo
          </div>
        )}

        {submitError && (
          <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3">{submitError}</div>
        )}

        <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-2">
          <span>Pregunta {index + 1} de {questions.length}</span>
          <span className="text-[10px] uppercase bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded font-bold">
            {isOpen(currentQuestion) ? 'Respuesta escrita' : 'Elegí una opción'}
          </span>
        </div>

        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-4 leading-snug">
          {currentQuestion.prompt}
        </div>

        {isOpen(currentQuestion) && (
          <div className="mb-6">
            <textarea
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value.slice(0, 2000) }))}
              rows={6}
              placeholder="Escribí tu respuesta. Fundamentala con lo que dice el texto."
              className="w-full px-3.5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white outline-none leading-relaxed"
            />
            <div className="text-[11px] text-stone-400 mt-1 text-right">{(answers[currentQuestion.id] ?? '').length} / 2000</div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mb-6">
          {currentQuestion.options?.map((option) => {
            const selected = answers[currentQuestion.id] === option;
            return (
              <label
                key={option}
                className={`flex items-center gap-3 text-xs sm:text-sm rounded-xl p-3.5 border transition-all cursor-pointer ${
                  selected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-950 dark:text-emerald-100 font-semibold shadow-2xs ring-1 ring-emerald-500/50'
                    : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-stone-300 text-slate-800 dark:text-stone-200'
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  checked={selected}
                  onChange={() => selectOption(option)}
                  className="accent-emerald-700 w-4 h-4 cursor-pointer"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-400">Guardado automático</span>
          <button
            onClick={handleNext}
            disabled={!(answers[currentQuestion.id] ?? '').trim() || submitting}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Enviando…' : isLast ? 'Enviar respuestas' : 'Siguiente pregunta'}</span>
            <Icon name="arrowRight" size={13} />
          </button>
        </div>
      </div>
      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleCodeScanned}
      />
    </div>
  );
}
