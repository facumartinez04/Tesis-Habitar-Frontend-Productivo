import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { HabitarLoader } from '../ui/HabitarLoader';
import { StudentQrScannerModal } from './StudentQrScannerModal';
import { ReadingHelpChat } from './ReadingHelpChat';
import { useQueryParam } from '../../../hooks/useQueryParam';
import {
  getActivityByCode,
  getStudentState,
  saveProgress,
  submitResponse,
  type AnswerPayload,
  type ActivityDocumentMeta,
  type DraftAnswers,
  type ReadingMode,
} from '../../../services/activityService';
import { DocumentViewer } from './DocumentViewer';
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

type Stage = 'loading' | 'not-found' | 'unavailable' | 'join' | 'reading' | 'answering' | 'submitted';

interface ActivityDraft {
  name: string;
  index: number;
  answers: Record<string, string>;
  phase?: 'reading' | 'answering';
  savedAt: string;
}

/** Cómo llegó la actividad: modo de lectura y si el docente ya habilitó las preguntas. */
interface ActivityMeta {
  readingMode: ReadingMode;
  questionsReleased: boolean;
  questionsReleasedAt: string | null;
  questionCount: number;
  readingHelp: boolean;
  /** PDF o Word original que subió el docente; null si cargó texto. */
  document: ActivityDocumentMeta | null;
}

function fromServerDraft(draft: DraftAnswers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [id, value] of Object.entries(draft)) {
    const v = value.selectedOption ?? value.textAnswer;
    if (v) result[id] = v;
  }
  return result;
}

/** Deja sólo las respuestas que siguen siendo válidas (el docente pudo haber corregido una opción). */
function keepValidAnswers(questions: Question[], answers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const q of questions) {
    const value = answers[q.id];
    if (!value) continue;
    if (isOpen(q) || (q.options ?? []).includes(value)) result[q.id] = value;
  }
  return result;
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
  const [submittedNote, setSubmittedNote] = useState<string | null>(null);
  const [meta, setMeta] = useState<ActivityMeta>({
    readingMode: 'LECTURA_PRIMERO',
    questionsReleased: true,
    questionsReleasedAt: null,
    questionCount: 0,
    readingHelp: false,
    document: null,
  });
  /** El alumno eligió leer el texto en lugar del documento (o el documento no se pudo abrir). */
  const [asText, setAsText] = useState(false);
  /** Palabra o frase que el alumno seleccionó en el texto, para preguntar qué significa. */
  const [selection, setSelection] = useState<string | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const [canRetry, setCanRetry] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showText, setShowText] = useState(false);
  /** La actividad cerró mientras el alumno estaba adentro: ya no puede avanzar. */
  const [closedReason, setClosedReason] = useState<'docente' | 'tiempo' | null>(null);
  const closedRef = useRef<'docente' | 'tiempo' | null>(null);

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
    closedRef.current = null;
    setClosedReason(null);
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
      const nextMeta: ActivityMeta = {
        readingMode: result.readingMode,
        questionsReleased: result.questionsReleased,
        questionsReleasedAt: result.questionsReleasedAt,
        questionCount: result.questionCount,
        readingHelp: result.readingHelp,
        document: result.document,
      };
      setMeta(nextMeta);
      setShowText(result.readingMode === 'LIBRE');

      const draft = loadDraft(cleanCode);
      if (draft) {
        setName(draft.name);
        void enterActivity(cleanCode, draft.name, nextMeta, result.questions, draft);
      } else {
        setStage('join');
      }
    });
  }

  useEffect(() => {
    loadActivity(queryCode);
  }, [queryCode]);

  useEffect(() => {
    if ((stage !== 'answering' && stage !== 'reading') || !name) return;
    saveDraft(currentCode, {
      name,
      index,
      answers,
      phase: stage,
      savedAt: new Date().toISOString(),
    });
  }, [currentCode, stage, name, index, answers]);

  /**
   * Entra a la actividad: el servidor dice si el alumno ya la envió (y entonces no puede volver a empezar), si tenía
   * un borrador para retomar, o si arranca de cero. El borrador local, si existe, es el más reciente.
   */
  async function enterActivity(
    code: string,
    studentName: string,
    activityMeta: ActivityMeta,
    activityQuestions: Question[],
    localDraft: ActivityDraft | null,
  ) {
    setJoining(true);
    try {
      const state = await getStudentState(code, studentName, getOrCreateDeviceId());
      if (state.status === 'ENVIADO') {
        clearDraft(code);
        setCanRetry(state.canRetry);
        setSubmittedNote(
          state.canRetry
            ? 'Ya enviaste esta actividad. Tu docente permite volver a hacerla.'
            : 'Ya completaste esta actividad: tus respuestas quedaron registradas y no se puede volver a hacer.',
        );
        setStage('submitted');
        return;
      }
      const restored = keepValidAnswers(activityQuestions, {
        ...fromServerDraft(state.answers),
        ...(localDraft?.answers ?? {}),
      });
      setAnswers(restored);
      setIndex(localDraft?.index ?? state.currentIndex);
      setResumed(state.status === 'EN_CURSO' || Boolean(localDraft));
      const wantsQuestions =
        activityMeta.readingMode === 'LIBRE' ||
        state.phase === 'RESPONDIENDO' ||
        localDraft?.phase === 'answering' ||
        Boolean(activityMeta.questionsReleasedAt);
      setStage(wantsQuestions && activityMeta.questionsReleased ? 'answering' : 'reading');
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        clearDraft(code);
        setJoinError(err.message);
        setStage(err.status === 409 && err.message.includes('no está disponible') ? 'unavailable' : 'join');
        if (err.status === 409 && err.message.includes('no está disponible')) setUnavailableMessage(err.message);
      } else {
        // Sin conexión: sigue con lo guardado en el dispositivo y se sincroniza cuando vuelva la red.
        if (localDraft) {
          setAnswers(localDraft.answers);
          setIndex(localDraft.index);
          setResumed(true);
        }
        setStage(
          activityMeta.questionsReleased && (activityMeta.readingMode === 'LIBRE' || localDraft?.phase === 'answering')
            ? 'answering'
            : 'reading',
        );
      }
    } finally {
      setJoining(false);
    }
  }

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
    await enterActivity(currentCode, trimmedName, metaRef.current, questions, null);
  }

  /** Con reintentos habilitados, quien ya envió puede volver a hacerla desde cero. */
  async function handleRetry() {
    try {
      await saveProgress(currentCode, {
        studentDisplayName: name,
        deviceId: getOrCreateDeviceId(),
        phase: 'LEYENDO',
        currentIndex: 0,
        answers: {},
        retry: true,
      });
      setAnswers({});
      setIndex(0);
      setCanRetry(false);
      setSubmittedNote(null);
      setResumed(false);
      setStage(metaRef.current.readingMode === 'LIBRE' && metaRef.current.questionsReleased ? 'answering' : 'reading');
    } catch (err) {
      setSubmittedNote(err instanceof ApiError ? err.message : 'No se pudo reiniciar. Revisá la conexión.');
    }
  }

  function handleSwitchToTeacher() {
    try {
      localStorage.removeItem('habitar_user_role');
    } catch {

    }
    window.location.href = '/login?switch=1';
  }

  const safeIndex = Math.min(index, Math.max(questions.length - 1, 0));
  const currentQuestion = questions[safeIndex];
  const isLast = safeIndex === questions.length - 1;
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim()).length;

  function selectOption(option: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
    setConfirmSubmit(false);
  }

  function goTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(nextIndex, questions.length - 1)));
    setConfirmSubmit(false);
  }

  function toDraft(): DraftAnswers {
    const draft: DraftAnswers = {};
    for (const q of questions) {
      const value = answers[q.id];
      if (!value || !value.trim()) continue;
      draft[q.id] = isOpen(q) ? { textAnswer: value } : { selectedOption: value };
    }
    return draft;
  }

  // El avance viaja al servidor con una pausa corta: el docente lo ve en vivo y el alumno puede retomarlo.
  useEffect(() => {
    if ((stage !== 'reading' && stage !== 'answering') || !name || !currentCode) return;
    const timer = window.setTimeout(() => {
      saveProgress(currentCode, {
        studentDisplayName: name,
        deviceId: getOrCreateDeviceId(),
        phase: stage === 'reading' ? 'LEYENDO' : 'RESPONDIENDO',
        currentIndex: safeIndex,
        answers: toDraft(),
      }).catch((err) => {
        if (err instanceof ApiError && err.status === 409 && err.message.startsWith('Ya completaste')) {
          clearDraft(currentCode);
          setSubmittedNote(err.message);
          setStage('submitted');
        } else if (err instanceof ApiError && err.status === 409 && err.message.includes('ya no está disponible')) {
          handleClosedRef.current('docente');
        }
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [stage, safeIndex, answers, name, currentCode, questions]);

  /**
   * Vuelve a pedir las preguntas (sin las respuestas correctas). Si el docente pasó a todos a las preguntas, el
   * alumno que estaba leyendo avanza solo; si corrigió una, se conservan las respuestas que siguen siendo válidas.
   */
  async function refreshQuestions(reason: 'released' | 'updated' | 'reconnect') {
    const result = await getActivityByCode(currentCode);
    if (!result.ok) {
      if (!result.notFound && result.message.includes('ya no está disponible')) handleClosedRef.current('docente');
      return;
    }
    const before = metaRef.current;
    setActivity(result.activity);
    setQuestions(result.questions);
    setAnswers((prev) => keepValidAnswers(result.questions, prev));
    setMeta({
      readingMode: result.readingMode,
      questionsReleased: result.questionsReleased,
      questionsReleasedAt: result.questionsReleasedAt,
      questionCount: result.questionCount,
      readingHelp: result.readingHelp,
      document: result.document,
    });
    const releasedNow = reason === 'released' || (!before.questionsReleasedAt && Boolean(result.questionsReleasedAt));
    if (releasedNow && result.questionsReleased && stageRef.current === 'reading') {
      setIndex(0);
      setNotice('Tu docente habilitó las preguntas. ¡A responder!');
      setStage('answering');
    } else if (reason === 'updated') {
      setNotice('Tu docente corrigió una pregunta. Revisá tu respuesta antes de enviar.');
    }
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
      await submitResponse(currentCode, name, getOrCreateDeviceId(), buildPayload());
      clearDraft(currentCode);
      setSubmittedNote(
        !automatic
          ? null
          : closedRef.current === 'docente'
            ? 'Tu docente cerró la actividad: enviamos las respuestas que tenías.'
            : 'El tiempo de la actividad terminó: enviamos las respuestas que tenías.',
      );
      setStage('submitted');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.message.startsWith('Ya enviaste')) {
        clearDraft(currentCode);
        setSubmittedNote(err.message);
        setStage('submitted');
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500 && closedRef.current) {
        clearDraft(currentCode);
        setUnavailableMessage('La actividad cerró y ya no se pudieron recibir tus respuestas. Avisale a tu docente.');
        setStage('unavailable');
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

  /**
   * La actividad cerró (la cerró el docente o venció el horario) con el alumno adentro: se bloquean las preguntas,
   * se le avisa y se envía lo que tenía respondido. Si no había respondido nada, sólo se le avisa.
   */
  function handleClosed(reason: 'docente' | 'tiempo') {
    if (closedRef.current) return;
    closedRef.current = reason;
    setClosedReason(reason);
    setConfirmSubmit(false);
    if (stageRef.current === 'answering' && answeredCount > 0) {
      void submitRef.current(true);
    } else if (stageRef.current === 'reading' || stageRef.current === 'answering' || stageRef.current === 'join') {
      clearDraft(currentCode);
      setUnavailableMessage(reason === 'docente' ? 'Tu docente cerró la actividad.' : 'El tiempo de la actividad terminó.');
      setStage('unavailable');
    }
  }
  const handleClosedRef = useRef(handleClosed);
  handleClosedRef.current = handleClosed;

  /** Selección corta en el texto (una palabra o una expresión): se ofrece preguntar qué significa. */
  function captureSelection() {
    if (!meta.readingHelp) return;
    window.setTimeout(() => {
      const text = (window.getSelection()?.toString() ?? '').replace(/\s+/g, ' ').trim();
      const words = text ? text.split(' ').length : 0;
      setSelection(text.length >= 2 && text.length <= 60 && words <= 6 ? text : null);
    }, 0);
  }

  const helpChat =
    meta.readingHelp && name ? (
      <ReadingHelpChat code={currentCode} studentName={name} selection={selection} onSelectionUsed={() => setSelection(null)} />
    ) : null;

  async function handleSend() {
    if (answeredCount < questions.length && !confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }
    setConfirmSubmit(false);
    await submitAll(false);
  }

  // Avisos en vivo de la actividad: el docente la abre, la cierra, habilita o corrige preguntas, y la pantalla
  // reacciona sin recargar.
  useLiveUpdates(currentCode && stage !== 'not-found' && stage !== 'submitted' ? { kind: 'activity', code: currentCode } : null, (payload) => {
    const status = payload?.status;
    const inside = stage === 'reading' || stage === 'answering';
    if (status !== 'CERRADA' && inside && payload?.event === 'questions-released') {
      void refreshQuestions('released');
    } else if (status !== 'CERRADA' && inside && payload?.event === 'questions-updated') {
      void refreshQuestions('updated');
    } else if (!payload && inside) {
      // Al reconectar, por si mientras tanto el docente habilitó o corrigió preguntas.
      void refreshQuestions('reconnect');
    } else if (status === 'CERRADA' && (inside || stage === 'join')) {
      handleClosed('docente');
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
      handleClosedRef.current('tiempo');
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
    const total = questions.length || meta.questionCount;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 text-center shadow-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Icon name="check" size={32} className="text-emerald-700 dark:text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">¡Actividad enviada!</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5">
            {submittedNote ?? 'Tus respuestas quedaron registradas. Tu docente es quien ve los resultados.'}
          </p>
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-700">
            {answeredCount > 0 && (
              <div className="text-xs text-stone-500">
                {answeredCount} de {total} preguntas respondidas
              </div>
            )}
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{activity.name}</div>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            {canRetry && (
              <button
                onClick={handleRetry}
                type="button"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                Volver a hacerla
              </button>
            )}
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

  const scanner = (
    <StudentQrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onCodeScanned={handleCodeScanned} />
  );

  const banners = (
    <>
      {notice && (
        <div className="flex items-start justify-between gap-2 text-xs font-semibold text-sky-900 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl px-3 py-2 mb-3">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-sky-700 dark:text-sky-300 cursor-pointer" aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
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
    </>
  );

  // Paso 1: lectura. Las preguntas aparecen cuando el alumno termina de leer, o cuando el docente las habilita.
  if (stage === 'reading') {
    const waitingTeacher = !meta.questionsReleased;
    return (
      <div className="min-h-screen flex flex-col items-center px-4 pt-16 pb-24 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-2xl bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 sm:p-7 shadow-md">
          <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Paso 1 de 2 · Lectura</div>
              <div className="text-sm font-bold text-emerald-750 dark:text-emerald-400">{activity.name}</div>
            </div>
            <div className="text-xs text-stone-500 font-semibold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full shrink-0">{name}</div>
          </div>
          {banners}
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            Leé el texto con atención. {waitingTeacher ? 'Las preguntas aparecen cuando tu docente las habilite.' : `Después vas a responder ${meta.questionCount} preguntas.`}
          </p>
          {meta.document && !asText ? (
            <div className="max-h-[70vh] overflow-y-auto p-2 sm:p-3 bg-stone-100 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 rounded-xl">
              <DocumentViewer code={currentCode} document={meta.document} onError={() => setAsText(true)} />
            </div>
          ) : (
            <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 rounded-xl">
              <div
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
                className="text-[14px] sm:text-[15px] text-slate-800 dark:text-stone-200 leading-[1.75] whitespace-pre-line"
              >
                {activity.sourceText}
              </div>
            </div>
          )}
          {meta.document && (
            <button
              type="button"
              onClick={() => setAsText((v) => !v)}
              className="mt-2 text-[11.5px] font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              {asText ? 'Ver el documento original' : 'Leer como texto (más grande, y para seleccionar palabras)'}
            </button>
          )}
          <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800">
            {waitingTeacher ? (
              <div className="flex items-center justify-center gap-2.5 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/60 rounded-xl px-4 py-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                </span>
                Esperando a que tu docente habilite las preguntas…
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setStage('answering');
                }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-3 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Terminé de leer · Ir a las preguntas
                <Icon name="arrowRight" size={14} />
              </button>
            )}
          </div>
        </div>
        {helpChat}
        {scanner}
      </div>
    );
  }

  // Cerró con el alumno respondiendo: no puede seguir; se le avisa mientras se envía lo que tenía.
  if (closedReason) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3" role="alert">
          <Icon name="clock" size={28} className="mx-auto text-amber-700 dark:text-amber-400" />
          <div className="text-lg font-bold text-slate-900 dark:text-white">La actividad cerró</div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {closedReason === 'docente' ? 'Tu docente cerró la actividad.' : 'Se terminó el horario de la actividad.'} Ya no se
            pueden cambiar las respuestas.
          </p>
          {submitError ? (
            <>
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                {submitError}
              </div>
              <button
                type="button"
                onClick={() => void submitAll(true)}
                disabled={submitting}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Enviando…' : 'Reintentar el envío'}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 border-t-transparent motion-safe:animate-spin" />
              Enviando las {answeredCount} respuestas que tenías…
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 pt-12 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <HabitarLoader size="lg" message="Cargando las preguntas..." />
      </div>
    );
  }

  const missing = questions.length - answeredCount;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-16 pb-24 bg-[#FAF9F6] dark:bg-[#0D0F14]">
      {studentBar}
      <div className="w-full max-w-lg bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 sm:p-7 shadow-md">
        <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            {meta.readingMode !== 'LIBRE' && (
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Paso 2 de 2 · Preguntas</div>
            )}
            <div className="text-sm font-bold text-emerald-750 dark:text-emerald-400">{activity.name}</div>
          </div>
          <div className="text-xs text-stone-500 font-semibold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full shrink-0">{name}</div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            aria-expanded={showText}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            <Icon name="fileText" size={13} />
            {showText ? 'Ocultar el texto' : meta.document ? 'Volver a ver el documento' : 'Volver a ver el texto'}
          </button>
          {showText && meta.document && !asText && (
            <div className="mt-2 max-h-[55vh] overflow-y-auto p-2 bg-stone-100 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 rounded-xl">
              <DocumentViewer code={currentCode} document={meta.document} onError={() => setAsText(true)} />
            </div>
          )}
          {showText && (!meta.document || asText) && (
            <div className="mt-2 max-h-[220px] overflow-y-auto p-3.5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 rounded-xl">
              <div
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
                className="text-xs sm:text-[13px] text-slate-800 dark:text-stone-200 leading-relaxed whitespace-pre-line"
              >
                {activity.sourceText}
              </div>
            </div>
          )}
          {showText && meta.document && (
            <button
              type="button"
              onClick={() => setAsText((v) => !v)}
              className="mt-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              {asText ? 'Ver el documento original' : 'Leer como texto'}
            </button>
          )}
        </div>

        {banners}

        {/* Navegación: cada punto es una pregunta; se puede volver a cualquiera y cambiar la respuesta antes de enviar. */}
        <div className="flex flex-wrap gap-1.5 mb-4" role="navigation" aria-label="Preguntas">
          {questions.map((q, i) => {
            const done = Boolean((answers[q.id] ?? '').trim());
            const current = i === safeIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={`Pregunta ${i + 1}${done ? ', respondida' : ''}`}
                className={`w-8 h-8 rounded-lg text-xs font-bold tabular-nums border transition-all cursor-pointer ${
                  current
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : done
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-stone-500'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-2">
          <span>
            Pregunta {safeIndex + 1} de {questions.length}
          </span>
          <span className="text-[10px] uppercase bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded font-bold">
            {isOpen(currentQuestion) ? 'Respuesta escrita' : 'Elegí una opción'}
          </span>
        </div>

        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-4 leading-snug">{currentQuestion.prompt}</div>

        {isOpen(currentQuestion) && (
          <div className="mb-6">
            <textarea
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 2000);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
                setConfirmSubmit(false);
              }}
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

        {confirmSubmit && (
          <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 mb-3">
            Te {missing === 1 ? 'falta 1 pregunta' : `faltan ${missing} preguntas`} sin responder. Tocá «Enviar igual» para
            enviar así, o volvé a las que están en blanco.
          </div>
        )}

        <div className="flex justify-between items-center gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
          >
            <Icon name="arrowLeft" size={13} />
            Anterior
          </button>
          <span className="text-[11px] text-stone-400 tabular-nums">
            {answeredCount}/{questions.length} respondidas
          </span>
          {isLast ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Enviando…' : confirmSubmit ? 'Enviar igual' : 'Enviar respuestas'}
              <Icon name="check" size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              Siguiente
              <Icon name="arrowRight" size={13} />
            </button>
          )}
        </div>
        {!isLast && answeredCount === questions.length && (
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting}
            className="w-full mt-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl py-2.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Ya respondí todo · Enviar respuestas'}
          </button>
        )}
      </div>
      {helpChat}
      {scanner}
    </div>
  );
}
