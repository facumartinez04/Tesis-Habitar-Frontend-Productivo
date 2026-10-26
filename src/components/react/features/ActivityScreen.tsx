import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { HabitarLoader } from '../ui/HabitarLoader';
import { StudentQrScannerModal } from './StudentQrScannerModal';
import { ReadingHelpChat } from './ReadingHelpChat';
import { StudentNameFields, fullStudentName, splitStudentName, studentNameError } from '../ui/StudentNameFields';
import { ReadAloud } from '../ui/ReadAloud';
import { StudentFeedbackView } from './StudentFeedbackView';
import { useQueryParam } from '../../../hooks/useQueryParam';
import {
  getActivityByCode,
  getStudentState,
  saveProgress,
  submitResponse,
  type AnswerPayload,
  getStudentFeedback,
  type ActivityDocumentMeta,
  type StudentFeedback,
  type DraftAnswers,
  type ReadingMode,
} from '../../../services/activityService';
import { DocumentViewer } from './DocumentViewer';
import { ApiError } from '../../../lib/apiClient';
import { confirmAction } from '../../../lib/alerts';
import { getOrCreateDeviceId, studentIdLabel, type StudentIdMode } from '../../../lib/studentDevice';
import { useLiveUpdates } from '../../../lib/realtime';
import { arInstant, whenLabel } from '../../../lib/activityDates';
import type { Activity } from '../../../types/activity';
import type { Question } from '../../../types/question';
import { setContextLocale, t, translate, useI18n, type Locale } from '../../../i18n';
import { LockedStudentName } from '../ui/LockedStudentName';
import { questionTypeOf } from '../../../types/question';

function isOpen(question: Question): boolean {
  const type = questionTypeOf(question);
  return type === 'ABIERTA' || type === 'COMPLETAR';
}

function isMulti(question: Question): boolean {
  return questionTypeOf(question) === 'OPCION_MULTIPLE';
}

function decodeMulti(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function closesAt(activity: Activity): number | null {
  return arInstant(activity.endDate || activity.availableFrom, activity.endTime);
}

interface ActivityScreenProps {
  defaultCode?: string;
}

type Stage = 'loading' | 'not-found' | 'unavailable' | 'join' | 'reading' | 'answering' | 'submitted' | 'feedback';

const FONT_SCALES = [1, 1.15, 1.3, 1.5];

interface ActivityDraft {
  name: string;
  index: number;
  answers: Record<string, string>;
  phase?: 'reading' | 'answering';
  savedAt: string;
}

interface ActivityMeta {
  readingMode: ReadingMode;
  questionsReleased: boolean;
  questionsReleasedAt: string | null;
  questionCount: number;
  readingHelp: boolean;
  document: ActivityDocumentMeta | null;
}

function fromServerDraft(draft: DraftAnswers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [id, value] of Object.entries(draft)) {
    const v = value.selectedOptions?.length ? JSON.stringify(value.selectedOptions) : value.selectedOption ?? value.textAnswer;
    if (v) result[id] = v;
  }
  return result;
}

function keepValidAnswers(questions: Question[], answers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const q of questions) {
    const value = answers[q.id];
    if (!value) continue;
    if (isMulti(q)) {
      const valid = decodeMulti(value).filter((o) => (q.options ?? []).includes(o));
      if (valid.length) result[q.id] = JSON.stringify(valid);
    } else if (isOpen(q) || (q.options ?? []).includes(value)) result[q.id] = value;
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
  useI18n();
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
  const [studentIdMode, setStudentIdMode] = useState<StudentIdMode>('nombre');
  const [activityLanguage, setActivityLanguage] = useState<Locale>('es');
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [nameParts, setNameParts] = useState({ firstName: '', lastName: '' });
  const [unavailableMessage, setUnavailableMessage] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [submittedNote, setSubmittedNote] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<StudentFeedback | null>(null);
  const [fontStep, setFontStep] = useState(0);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('habitar_font_step'));
      if (saved > 0 && saved < FONT_SCALES.length) setFontStep(saved);
    } catch {
    }
  }, []);
  function changeFont(delta: number) {
    setFontStep((f) => {
      const next = Math.max(0, Math.min(FONT_SCALES.length - 1, f + delta));
      try {
        localStorage.setItem('habitar_font_step', String(next));
      } catch {
      }
      return next;
    });
  }
  const fontScale = FONT_SCALES[fontStep];

  async function loadFeedback(code: string, studentName: string): Promise<boolean> {
    if (!studentName.trim()) return false;
    try {
      const fb = await getStudentFeedback(code, studentName, getOrCreateDeviceId());
      setFeedback(fb);
      setName(studentName);
      setStage('feedback');
      return true;
    } catch {
      return false;
    }
  }
  const [meta, setMeta] = useState<ActivityMeta>({
    readingMode: 'LECTURA_PRIMERO',
    questionsReleased: true,
    questionsReleasedAt: null,
    questionCount: 0,
    readingHelp: false,
    document: null,
  });
  const [asText, setAsText] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const [canRetry, setCanRetry] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
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
      if (savedName) setLockedName(savedName);
      if (savedName && !name) {
        setName(savedName);
        if (!/^(n\.º\s*)?\d+$/i.test(savedName)) setNameParts(splitStudentName(savedName));
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
          return;
        }
        let saved = '';
        try {
          saved = localStorage.getItem('habitar_student_name') ?? '';
        } catch {
        }
        void loadFeedback(cleanCode, saved).then((shown) => {
          if (shown) return;
          setUnavailableMessage(result.message);
          setStage('unavailable');
        });
        return;
      }
      setActivity(result.activity);
      setContextLocale(result.language);
      setActivityLanguage(result.language);
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
            ? t('Ya enviaste esta actividad. Tu docente permite volver a hacerla.')
            : t('Ya completaste esta actividad: tus respuestas quedaron registradas y no se puede volver a hacer.'),
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
    let trimmedName = name.trim();
    if (lockedName) {
      trimmedName = lockedName;
      setName(lockedName);
    } else if (studentIdMode === 'nombre') {
      const problem = studentNameError(nameParts.firstName, nameParts.lastName);
      if (problem) {
        setJoinError(problem);
        return;
      }
      trimmedName = fullStudentName(nameParts.firstName, nameParts.lastName);
      setName(trimmedName);
    }
    if (!trimmedName) return;
    if (studentIdMode === 'lista' && !/^\d{1,3}$/.test(trimmedName.replace(/^(n\.?\s*[º°o]?\.?\s*|#\s*)/i, ''))) {
      setJoinError(t('Ingresá sólo tu número de lista, por ejemplo 12.'));
      return;
    }
    setJoinError(null);
    try {
      localStorage.setItem('habitar_student_name', trimmedName);
    } catch {

    }
    await enterActivity(currentCode, trimmedName, metaRef.current, questions, null);
  }

  async function handleRetry() {
    const ok = await confirmAction({
      title: t('¿Volver a hacer la actividad?'),
      text: t('Empezás de cero. Tu docente va a ver los dos intentos.'),
      confirmButtonText: t('Sí, empezar de nuevo'),
    });
    if (!ok) return;
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
      setSubmittedNote(err instanceof ApiError ? err.message : t('No se pudo reiniciar. Revisá la conexión.'));
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
  }

  function toggleOption(option: string) {
    setAnswers((prev) => {
      const current = decodeMulti(prev[currentQuestion.id]);
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      const copy = { ...prev };
      if (next.length) copy[currentQuestion.id] = JSON.stringify(next);
      else delete copy[currentQuestion.id];
      return copy;
    });
  }

  function goTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(nextIndex, questions.length - 1)));
  }

  function toDraft(): DraftAnswers {
    const draft: DraftAnswers = {};
    for (const q of questions) {
      const value = answers[q.id];
      if (!value || !value.trim()) continue;
      draft[q.id] = isMulti(q) ? { selectedOptions: decodeMulti(value) } : isOpen(q) ? { textAnswer: value } : { selectedOption: value };
    }
    return draft;
  }

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
      setNotice(t('Tu docente habilitó las preguntas. ¡A responder!'));
      setStage('answering');
    } else if (reason === 'updated') {
      setNotice(t('Tu docente corrigió una pregunta. Revisá tu respuesta antes de enviar.'));
    }
  }

  function buildPayload(): AnswerPayload[] {
    return questions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== '')
      .map((q) =>
        isMulti(q)
          ? { questionId: q.id, selectedOptions: decodeMulti(answers[q.id]) }
          : isOpen(q)
            ? { questionId: q.id, textAnswer: answers[q.id] }
            : { questionId: q.id, selectedOption: answers[q.id] },
      );
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
            ? t('Tu docente cerró la actividad: enviamos las respuestas que tenías.')
            : t('El tiempo de la actividad terminó: enviamos las respuestas que tenías.'),
      );
      setStage('submitted');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.message.startsWith('Ya enviaste')) {
        clearDraft(currentCode);
        setSubmittedNote(err.message);
        setStage('submitted');
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500 && closedRef.current) {
        clearDraft(currentCode);
        setUnavailableMessage(t('La actividad cerró y ya no se pudieron recibir tus respuestas. Avisale a tu docente.'));
        setStage('unavailable');
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setSubmitError(err.message);
      } else {
        setSubmitError(t('No se pudo enviar. Tus respuestas están guardadas: reintentá cuando tengas conexión.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const submitRef = useRef(submitAll);
  submitRef.current = submitAll;

  function handleClosed(reason: 'docente' | 'tiempo') {
    if (closedRef.current) return;
    closedRef.current = reason;
    void import('sweetalert2').then((m) => m.default.close());
    setClosedReason(reason);
    if (stageRef.current === 'answering' && answeredCount > 0) {
      void submitRef.current(true);
    } else if (stageRef.current === 'reading' || stageRef.current === 'answering' || stageRef.current === 'join') {
      clearDraft(currentCode);
      setUnavailableMessage(reason === 'docente' ? t('Tu docente cerró la actividad.') : t('El tiempo de la actividad terminó.'));
      setStage('unavailable');
    }
  }
  const handleClosedRef = useRef(handleClosed);
  handleClosedRef.current = handleClosed;

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
    const left = questions.length - answeredCount;
    const ok = await confirmAction({
      title: t('¿Enviar tus respuestas?'),
      text:
        left > 0
          ? t('Te {value} sin responder: si enviás ahora, cuentan como no respondidas. Después de enviar no vas a poder cambiar nada.', { value: left === 1 ? t('falta 1 pregunta') : t('faltan {left} preguntas', { left }) })
          : t('Respondiste todas las preguntas. Después de enviar no vas a poder cambiar las respuestas.'),
      confirmButtonText: left > 0 ? t('Enviar igual') : t('Sí, enviar'),
    });
    if (!ok || closedRef.current) return;
    await submitAll(false);
  }

  async function handleFinishReading() {
    const ok = await confirmAction({
      title: t('¿Terminaste de leer?'),
      text: t('Vas a pasar {value}. El texto lo vas a poder volver a mirar, pero no vas a volver a esta pantalla.', { value: meta.questionCount === 1 ? t('a la pregunta') : t('a las {questionCount} preguntas', { questionCount: meta.questionCount }) }),
      confirmButtonText: t('Sí, ir a las preguntas'),
    });
    if (!ok || stageRef.current !== 'reading') return;
    setIndex(0);
    setStage('answering');
  }

  useLiveUpdates(currentCode && stage !== 'not-found' && stage !== 'feedback' ? { kind: 'activity', code: currentCode } : null, (payload) => {
    const status = payload?.status;
    const inside = stage === 'reading' || stage === 'answering';
    if (status === 'CERRADA' && stage === 'submitted') {
      void loadFeedback(currentCode, name);
    } else if (status !== 'CERRADA' && inside && payload?.event === 'questions-released') {
      void refreshQuestions('released');
    } else if (status !== 'CERRADA' && inside && payload?.event === 'questions-updated') {
      void refreshQuestions('updated');
    } else if (!payload && inside) {
      void refreshQuestions('reconnect');
    } else if (status === 'CERRADA' && (inside || stage === 'join')) {
      handleClosed('docente');
    } else if (status === 'PUBLICADA' && stage === 'unavailable') {
      loadActivity(currentCode);
    }
  });

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
        <Icon name="backpack" size={16} className="text-emerald-700 dark:text-emerald-400" />
        <span className="font-bold text-slate-900 dark:text-white">{t('Modo Alumno')}</span>
        <span className="hidden sm:inline text-stone-400">{t('· Guardado automático local')}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsScannerOpen(true)}
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-850 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
          title={t('Escanear código QR de clase')}
        >
          <Icon name="camera" size={13} />
          <span>{t('Escanear QR')}</span>
        </button>
        <button
          onClick={handleSwitchToTeacher}
          type="button"
          className="text-xs font-semibold text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer px-2 py-1 rounded-lg"
        >
          {t('¿Sos docente?')}
        </button>
      </div>
    </div>
  );

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 pt-12 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <HabitarLoader size="lg" message={t('Cargando tu actividad de lectura...')} />
      </div>
    );
  }

  if (stage === 'feedback' && feedback) {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 pt-16 pb-10 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <StudentFeedbackView feedback={feedback} studentName={name} />
        <StudentQrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onCodeScanned={handleCodeScanned} />
      </div>
    );
  }

  if (stage === 'not-found' || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-2xl shadow-2xs">
            <Icon name="backpack" size={26} className="text-emerald-700 dark:text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('Portal del Alumno')}</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              {t('Ingresá el código PIN que te dio tu docente o escaneá el QR del aula para resolver la actividad.')}
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
                placeholder={t('Ej: HAB-4B29')}
                className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-center font-mono font-bold tracking-widest text-lg uppercase bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={!pinInput.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {t('Buscar Actividad')}
            </button>
          </form>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('O también')}</span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          >
            <Icon name="camera" size={16} className="text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>{t('Escanear Código QR con Cámara')}</span>
          </button>

          {currentCode && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl p-3 text-center leading-snug">
              {t('No encontramos una actividad activa con el código')}{' '}<strong>{currentCode}</strong>{t('. Verificá si está bien escrito o escaneá el QR del aula.')}
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
          <p className="text-xs text-stone-500">{t('Consultá a tu docente si la actividad sigue abierta.')}</p>
          <button
            type="button"
            onClick={() => {
              setStage('not-found');
              setCurrentCode('');
              setPinInput('');
            }}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            {t('Ingresar otro código')}
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
          {lockedName ? (
            <LockedStudentName name={lockedName} />
          ) : studentIdMode === 'nombre' ? (
            <div className="mb-2">
              <StudentNameFields
                firstName={nameParts.firstName}
                lastName={nameParts.lastName}
                onChange={(v) => {
                  setNameParts(v);
                  setJoinError(null);
                }}
                inputClassName="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white font-medium focus:border-emerald-600 focus:bg-white outline-none shadow-inner"
                autoFocus
              />
            </div>
          ) : (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-center mb-2 bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white font-medium focus:border-emerald-600 focus:bg-white outline-none shadow-inner"
              placeholder={label.placeholder}
              autoFocus
            />
          )}
          {joinError && <div className="text-xs text-rose-700 text-center mb-2">{joinError}</div>}
          <div className="mb-2" />
          <button
            onClick={handleJoin}
            disabled={(lockedName ? false : studentIdMode === 'nombre' ? !nameParts.firstName.trim() || !nameParts.lastName.trim() : !name.trim()) || joining}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            {joining ? t('Ingresando…') : t('Comenzar actividad de lectura')}
          </button>
          <div className="text-center text-[11px] text-stone-500 mt-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <span className="font-bold text-slate-800 dark:text-slate-200">{activity.name}</span>
            <br />
            {t('Código:')}{' '}<span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">{currentCode}</span>
            {activity.endTime && <>{' '}{t('· Disponible hasta {whenLabel}', { whenLabel: whenLabel(activity.endDate || activity.availableFrom, activity.endTime) })}</>}
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('¡Actividad enviada!')}</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5">
            {submittedNote ?? t('Tus respuestas quedaron registradas.')}{' '}{t('Cuando tu docente cierre la actividad, vas a ver acá tus resultados.')}
          </p>
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-700">
            {answeredCount > 0 && (
              <div className="text-xs text-stone-500">
                {t('{answeredCount} de {total} preguntas respondidas', { answeredCount, total })}
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
                {t('Volver a hacerla')}
              </button>
            )}
            <button
              onClick={() => setIsScannerOpen(true)}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
            >
              <Icon name="camera" size={14} />
              <span>{t('Escanear otro código QR')}</span>
            </button>
            <button
              onClick={() => {
                setStage('not-found');
                setPinInput('');
              }}
              type="button"
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-slate-900 hover:underline cursor-pointer py-1.5"
            >
              {t('Ingresar otro código PIN')}
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
          <button type="button" onClick={() => setNotice(null)} className="text-sky-700 dark:text-sky-300 cursor-pointer" aria-label={t('Cerrar aviso')}>
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      {resumed && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          <Icon name="refresh" size={13} />
          {t('Retomaste la actividad donde la habías dejado')}
        </div>
      )}
      {!isOnline && (
        <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 rounded-xl px-3 py-2 mb-3">
          <Icon name="alertTriangle" size={13} />
          {t('Sin conexión — tus respuestas se siguen guardando en este dispositivo')}
        </div>
      )}
      {submitError && (
        <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3">{submitError}</div>
      )}
    </>
  );

  if (stage === 'reading') {
    const waitingTeacher = !meta.questionsReleased;
    return (
      <div className="min-h-screen flex flex-col items-center px-4 pt-16 pb-24 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-2xl bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 sm:p-7 shadow-md">
          <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{t('Paso 1 de 2 · Lectura')}</div>
              <div className="text-sm font-bold text-emerald-750 dark:text-emerald-400">{activity.name}</div>
            </div>
            <div className="text-xs text-stone-500 font-semibold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full shrink-0">{name}</div>
          </div>
          {banners}
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
            {t('Leé el texto con atención.')}{' '}{waitingTeacher ? t('Las preguntas aparecen cuando tu docente las habilite.') : t('Después vas a responder {questionCount} preguntas.', { questionCount: meta.questionCount })}
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ReadAloud text={activity.sourceText ?? ''} label={t('Escuchar el texto')} lang={activityLanguage} />
            <TextSizeControls onChange={changeFont} step={fontStep} max={FONT_SCALES.length - 1} />
          </div>
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
                style={fontStep ? { fontSize: `${15 * fontScale}px` } : undefined}
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
              {asText ? t('Ver el documento original') : t('Leer como texto (más grande, y para seleccionar palabras)')}
            </button>
          )}
          <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800">
            {waitingTeacher ? (
              <div className="flex items-center justify-center gap-2.5 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/60 rounded-xl px-4 py-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                </span>
                {t('Esperando a que tu docente habilite las preguntas…')}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFinishReading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-3 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                {t('Terminé de leer · Ir a las preguntas')}
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

  if (closedReason) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#FAF9F6] dark:bg-[#0D0F14]">
        {studentBar}
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3" role="alert">
          <Icon name="clock" size={28} className="mx-auto text-amber-700 dark:text-amber-400" />
          <div className="text-lg font-bold text-slate-900 dark:text-white">{t('La actividad cerró')}</div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {closedReason === 'docente' ? t('Tu docente cerró la actividad.') : t('Se terminó el horario de la actividad.')}{' '}{t('Ya no se pueden cambiar las respuestas.')}
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
                {submitting ? t('Enviando…') : t('Reintentar el envío')}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 border-t-transparent motion-safe:animate-spin" />
              {t('Enviando las {answeredCount} respuestas que tenías…', { answeredCount })}
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
        <HabitarLoader size="lg" message={t('Cargando las preguntas...')} />
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
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{t('Paso 2 de 2 · Preguntas')}</div>
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
            {showText ? t('Ocultar el texto') : meta.document ? t('Volver a ver el documento') : t('Volver a ver el texto')}
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
              {asText ? t('Ver el documento original') : t('Leer como texto')}
            </button>
          )}
        </div>

        {banners}

        <div className="flex flex-wrap gap-1.5 mb-4" role="navigation" aria-label={t('Preguntas')}>
          {questions.map((q, i) => {
            const done = Boolean((answers[q.id] ?? '').trim());
            const current = i === safeIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={t('Pregunta {value}{value2}', { value: i + 1, value2: done ? t(', respondida') : '' })}
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
            {t('Pregunta {value} de {questionsCount}', { value: safeIndex + 1, questionsCount: questions.length })}
          </span>
          <span className="text-[10px] uppercase bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded font-bold">
            {questionTypeOf(currentQuestion) === 'ABIERTA'
              ? t('Respuesta escrita')
              : questionTypeOf(currentQuestion) === 'COMPLETAR'
                ? t('Completá el espacio en blanco')
                : isMulti(currentQuestion)
                  ? t('Elegí todas las correctas')
                  : t('Elegí una opción')}
          </span>
        </div>

        <div
          className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug"
          style={fontStep ? { fontSize: `${16 * fontScale}px` } : undefined}
        >
          {currentQuestion.prompt}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ReadAloud
            lang={activityLanguage}
            text={`${currentQuestion.prompt} ${
              currentQuestion.options?.length ? translate(activityLanguage, 'Opciones: {join}.', { join: currentQuestion.options.map((o, i) => `${i + 1}, ${o}`).join('. ') }) : ''
            }`}
            label={t('Escuchar la pregunta')}
          />
          <TextSizeControls onChange={changeFont} step={fontStep} max={FONT_SCALES.length - 1} />
        </div>

        {questionTypeOf(currentQuestion) === 'COMPLETAR' && (
          <div className="mb-6">
            <input
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 200);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
              }}
              placeholder={t('Escribí la palabra o frase que falta')}
              aria-label={t('Respuesta para completar')}
              autoCapitalize="none"
              className="w-full px-3.5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white outline-none"
            />
          </div>
        )}

        {questionTypeOf(currentQuestion) === 'ABIERTA' && (
          <div className="mb-6">
            <textarea
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 2000);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
              }}
              rows={6}
              placeholder={t('Escribí tu respuesta. Fundamentala con lo que dice el texto.')}
              className="w-full px-3.5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white outline-none leading-relaxed"
            />
            <div className="text-[11px] text-stone-400 mt-1 text-right">{(answers[currentQuestion.id] ?? '').length} / 2000</div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mb-6">
          {!isOpen(currentQuestion) && currentQuestion.options?.map((option) => {
            const multi = isMulti(currentQuestion);
            const selected = multi ? decodeMulti(answers[currentQuestion.id]).includes(option) : answers[currentQuestion.id] === option;
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
                  type={multi ? 'checkbox' : 'radio'}
                  name={currentQuestion.id}
                  checked={selected}
                  onChange={() => (multi ? toggleOption(option) : selectOption(option))}
                  className="accent-emerald-700 w-4 h-4 cursor-pointer"
                />
                <span style={fontStep ? { fontSize: `${14 * fontScale}px` } : undefined}>{option}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-between items-center gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
          >
            <Icon name="arrowLeft" size={13} />
            {t('Anterior')}
          </button>
          <span className="text-[11px] text-stone-400 tabular-nums">
            {t('{answeredCount}/{questionsCount} respondidas', { answeredCount, questionsCount: questions.length })}
          </span>
          {isLast ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? t('Enviando…') : t('Enviar respuestas')}
              <Icon name="check" size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              {t('Siguiente')}
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
            {submitting ? t('Enviando…') : t('Ya respondí todo · Enviar respuestas')}
          </button>
        )}
      </div>
      {helpChat}
      {scanner}
    </div>
  );
}

function TextSizeControls({ onChange, step, max }: { onChange: (delta: number) => void; step: number; max: number }) {
  useI18n();
  const btn =
    'w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold disabled:opacity-40 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800';
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t('Tamaño de letra')}>
      <button type="button" onClick={() => onChange(-1)} disabled={step === 0} className={`${btn} text-[11px]`} aria-label={t('Achicar la letra')}>
        A−
      </button>
      <button type="button" onClick={() => onChange(1)} disabled={step === max} className={`${btn} text-[14px]`} aria-label={t('Agrandar la letra')}>
        A+
      </button>
    </div>
  );
}
