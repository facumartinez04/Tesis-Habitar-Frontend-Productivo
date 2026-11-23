import { useStore } from '@nanostores/react';
import { showError } from '../../../../lib/alerts';
import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { RadioGroup } from '../../ui/RadioGroup';
import { ToggleSwitch } from '../../ui/ToggleSwitch';
import { Stepper } from '../../ui/Stepper';
import { createActivity, saveActivityAsTemplate, uploadActivityDocument, type ReadingMode } from '../../../../services/activityService';
import { clearWizardDocument, loadWizardDocument } from '../../../../lib/wizardDocument';
import { listMyCourses } from '../../../../services/courseService';
import { activityWizardStore, updateWizard, currentTimeInArgentina, defaultActivityWindow, todayInArgentina } from '../../../../store/activityWizardStore';
import type { AttemptPolicy, Course, DiagnosticType } from '../../../../types/activity';
import { arInstant, durationLabel, whenLabel } from '../../../../lib/activityDates';
import { t, useI18n } from '../../../../i18n';

export function ConfigureActivityStep() {
  useI18n();
  const wizard = useStore(activityWizardStore);
  const [name, setName] = useState(wizard.name || t('Comprensión lectora — Biodiversidad'));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [windowRefreshed, setWindowRefreshed] = useState(false);

  useEffect(() => {
    if (wizard.questions.length === 0) {
      window.location.href = '/docente/actividades/nueva';
      return;
    }
    // El asistente se guarda en el navegador: si se retoma días después, las fechas guardadas ya pasaron.
    // En ese caso se arranca de nuevo desde ahora en vez de dejar un cierre vencido.
    const savedClose = arInstant(wizard.endDate || wizard.availableFrom, wizard.endTime);
    if (savedClose !== null && savedClose <= Date.now()) {
      updateWizard(defaultActivityWindow());
      setWindowRefreshed(true);
    }
    listMyCourses().then((result) => {
      setCourses(result);
      if (!wizard.courseId && result[0]) {
        updateWizard({ courseId: result[0].id, courseName: result[0].name });
      }
    });

  }, []);

  function handleCourseChange(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    updateWizard({ courseId, courseName: course?.name ?? '' });
  }

  const endDate = wizard.endDate || wizard.availableFrom;
  const opensAt = arInstant(wizard.availableFrom, wizard.startTime);
  const closesAt = arInstant(endDate, wizard.endTime);
  const windowValid = opensAt !== null && closesAt !== null && closesAt > opensAt;

  /** «Ahora»: la actividad abre en este momento (hora de Argentina). Si el cierre queda antes, se lo corre. */
  function openNow() {
    const date = todayInArgentina();
    const time = currentTimeInArgentina();
    const open = arInstant(date, time);
    const patch: { availableFrom: string; startTime: string; endDate?: string; endTime?: string } = { availableFrom: date, startTime: time };
    if (open === null || closesAt === null || closesAt <= open) {
      const next = defaultActivityWindow();
      patch.endDate = next.endDate;
      patch.endTime = next.endTime;
    }
    updateWizard(patch);
    setWindowRefreshed(false);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!windowValid) {
      setSubmitError(t('[Error-PAR_002] El cierre tiene que ser posterior a la apertura'));
      return;
    }
    if (closesAt !== null && closesAt <= Date.now()) {
      const now = `${currentTimeInArgentina()} h del ${todayInArgentina().split('-').reverse().join('/')}`;
      setSubmitError(t('El cierre ya pasó (ahora son las {now}, hora de Argentina). Elegí una fecha y hora de cierre futuras.', { now }));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const activity = await createActivity({
        name,
        courseId: wizard.courseId,
        educationLevel: wizard.educationLevel,
        axis: wizard.axis,
        sourceText: wizard.sourceText,
        availableFrom: wizard.availableFrom,
        startTime: wizard.startTime,
        endDate: endDate,
        endTime: wizard.endTime,
        attemptPolicy: wizard.attemptPolicy,
        readingMode: wizard.readingMode ?? 'LECTURA_PRIMERO',
        readingHelp: wizard.readingHelp ?? true,
        showFeedback: wizard.showFeedback ?? true,
        templateId: wizard.templateId ?? null,
        language: wizard.language,
        questions: wizard.questions,
        diagnosticType: wizard.diagnosticType,
      });
      if (wizard.documentName) {
        const doc = await loadWizardDocument();
        if (doc) {
          try {
            await uploadActivityDocument(activity.id, doc);
            await clearWizardDocument();
          } catch (err) {
            await showError(
              t('La actividad se creó, pero el documento no se pudo subir'),
              t('{value} Los alumnos van a leer el texto.', { value: err instanceof Error ? err.message : '' }).trim(),
            );
          }
        }
      }
      if (wizard.saveToBank) {
        await saveActivityAsTemplate(activity.id).catch((err: Error) =>
          showError(t('La actividad se creó, pero no se pudo guardar en el banco'), err.message),
        );
      }
      updateWizard({ name, generatedCode: activity.code, generatedActivityId: activity.id, documentName: null, templateId: null });
      window.location.href = '/docente/actividades/nueva/qr';
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('No se pudo crear la actividad. Intentá de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (wizard.questions.length === 0) return null;

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">{t('Configurar actividad')}</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">{t('Definí curso, ventana horaria y política de intentos')}</div>

      <Stepper
        steps={[
          { label: t('Texto'), state: 'done' },
          { label: t('Revisar'), state: 'done' },
          { label: t('Configurar'), state: 'current' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      <div className="form-group mb-3">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Curso de destino')}</label>
        <select
          className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
          value={wizard.courseId}
          onChange={(e) => handleCourseChange(e.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.name} — {course.subject}</option>
          ))}
        </select>
      </div>

      {windowRefreshed && (
        <div className="mb-2.5 text-[11.5px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 rounded-lg px-3 py-2">
          {t('Las fechas que tenías guardadas ya habían pasado: las actualicé a partir de ahora. Revisalas antes de confirmar.')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1.5">
        <div className="form-group">
          <div className="flex items-center justify-between mb-[5px]">
            <label className="block text-[11px] text-text-sec font-medium">{t('Abre')}</label>
            <button
              type="button"
              onClick={openNow}
              title={t('Abrir la actividad en este momento')}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
            >
              {t('Ahora')}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={wizard.availableFrom}
              onChange={(e) => {
                const value = e.target.value;
                updateWizard({ availableFrom: value, ...(endDate < value ? { endDate: value } : {}) });
              }}
              className="flex-1 min-w-0 px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
            <input
              type="time"
              value={wizard.startTime}
              onChange={(e) => updateWizard({ startTime: e.target.value })}
              className="w-[100px] px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
          </div>
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Cierra')}</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              min={wizard.availableFrom}
              onChange={(e) => updateWizard({ endDate: e.target.value })}
              className="flex-1 min-w-0 px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
            <input
              type="time"
              value={wizard.endTime}
              onChange={(e) => updateWizard({ endTime: e.target.value })}
              className="w-[100px] px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
          </div>
        </div>
      </div>
      <div className={`text-[11.5px] mb-3.5 ${windowValid ? 'text-text-sec' : 'text-red'}`}>
        {windowValid && opensAt !== null && closesAt !== null ? (
          <>
            {t('Abre {whenLabel} y cierra {whenLabel2} · dura', { whenLabel: whenLabel(wizard.availableFrom, wizard.startTime), whenLabel2: whenLabel(endDate, wizard.endTime) })}{' '}
            <strong>{durationLabel(opensAt, closesAt)}</strong>
          </>
        ) : (
          t('El cierre tiene que ser posterior a la apertura. Si termina después de las 00:00, elegí el día siguiente en «Cierra».')
        )}
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Política de intentos')}</label>
        <RadioGroup
          options={[
            { value: 'unico' as AttemptPolicy, label: t('Único intento') },
            { value: 'reintentos' as AttemptPolicy, label: t('Permitir reintentos') },
          ]}
          value={wizard.attemptPolicy}
          onChange={(value) => updateWizard({ attemptPolicy: value })}
        />
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Lectura')}</label>
        <RadioGroup
          options={[
            { value: 'LECTURA_PRIMERO' as ReadingMode, label: t('Primero leen el texto, después responden') },
            { value: 'DOCENTE_HABILITA' as ReadingMode, label: t('Leen y yo habilito las preguntas para todos') },
            { value: 'LIBRE' as ReadingMode, label: t('Texto y preguntas juntos') },
          ]}
          value={wizard.readingMode ?? 'LECTURA_PRIMERO'}
          onChange={(value) => updateWizard({ readingMode: value })}
        />
        <div className="text-[11px] text-text-ter mt-1">
          {t('En cualquier modo podés pasar a todos a las preguntas desde el panel en vivo.')}
        </div>
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.showFeedback ?? true}
          onChange={(value) => updateWizard({ showFeedback: value })}
          label={t('Mostrar resultados al alumno al cerrar')}
          description={t('Cuando cierres la actividad, cada alumno ve desde su celular qué respondió, cuáles acertó y la respuesta correcta. Las respuestas escritas muestran tu puntaje cuando las revises.')}
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.saveToBank ?? false}
          onChange={(value) => updateWizard({ saveToBank: value })}
          label={t('Guardar en el banco de la institución')}
          description={t('Guarda el texto y las preguntas para que vos u otros docentes la reutilicen. No se borra al cerrar la actividad. El documento no se guarda: se muestra a los alumnos y se borra solo al vencer la actividad.')}
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.readingHelp ?? true}
          onChange={(value) => updateWizard({ readingHelp: value })}
          label={t('Ayuda con el texto')}
          description={t('Cada alumno puede preguntarle a la IA qué significa una palabra o una frase. No le responde las preguntas de la actividad, y vos ves sus dudas en el panel en vivo.')}
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Tipo de actividad')}</label>
        <RadioGroup
          options={[
            { value: '' as DiagnosticType | '', label: t('Actividad común') },
            { value: 'inicio' as DiagnosticType | '', label: t('Diagnóstica de inicio del ciclo') },
            { value: 'cierre' as DiagnosticType | '', label: t('Diagnóstica de cierre del ciclo') },
          ]}
          value={wizard.diagnosticType ?? ''}
          onChange={(value) => updateWizard({ diagnosticType: value || null })}
        />
        {wizard.diagnosticType && (
          <div className="text-[11px] text-text-sec mt-1.5">
            {t('Habitar compara la diagnóstica de inicio con la de cierre para mostrar cuánto mejoró cada alumno en cada eje. Para que sean comparables, conviene usar textos de dificultad similar.')}
          </div>
        )}
      </div>

      <div className="form-group mb-4">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">{t('Nombre de la actividad (opcional)')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
        />
      </div>

      {submitError && (
        <div className="text-xs text-red bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-3">{submitError}</div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <a href="/docente/actividades/nueva/revisar" className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-3.5 py-2 text-[12.5px]">
          <Icon name="arrowLeft" size={13} />
          {t('Volver')}
        </a>
        <button
          onClick={handleSubmit}
          disabled={submitting || !wizard.courseId}
          className="bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {submitting ? t('Generando…') : t('Confirmar y generar QR')}
        </button>
      </div>
    </div>
  );
}
