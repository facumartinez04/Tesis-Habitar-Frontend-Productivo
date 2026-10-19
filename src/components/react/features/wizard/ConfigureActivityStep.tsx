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

export function ConfigureActivityStep() {
  const wizard = useStore(activityWizardStore);
  const [name, setName] = useState(wizard.name || 'Comprensión lectora — Biodiversidad');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (wizard.questions.length === 0) {
      window.location.href = '/docente/actividades/nueva';
      return;
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

  // Ventana: la fecha de cierre puede ser otro día (por ejemplo, de las 22:00 a las 10:00 del día siguiente).
  const endDate = wizard.endDate || wizard.availableFrom;
  const opensAt = arInstant(wizard.availableFrom, wizard.startTime);
  const closesAt = arInstant(endDate, wizard.endTime);
  const windowValid = opensAt !== null && closesAt !== null && closesAt > opensAt;

  async function handleSubmit() {
    if (!windowValid) {
      setSubmitError('[Error-PAR_002] El cierre tiene que ser posterior a la apertura');
      return;
    }
    if (closesAt !== null && closesAt <= Date.now()) {
      setSubmitError('El cierre ya pasó. Elegí una fecha y hora de cierre futuras.');
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
        questions: wizard.questions,
        diagnosticType: wizard.diagnosticType,
      });
      // El PDF o Word original se sube aparte; si falla, la actividad queda igual y los alumnos leen el texto.
      if (wizard.documentName) {
        const doc = await loadWizardDocument();
        if (doc) {
          try {
            await uploadActivityDocument(activity.id, doc);
            await clearWizardDocument();
          } catch (err) {
            await showError(
              'La actividad se creó, pero el documento no se pudo subir',
              `${err instanceof Error ? err.message : ''} Los alumnos van a leer el texto.`.trim(),
            );
          }
        }
      }
      // Si lo pidió, queda en el banco de la institución (texto, preguntas y documento) para reutilizarla.
      if (wizard.saveToBank) {
        await saveActivityAsTemplate(activity.id).catch((err: Error) =>
          showError('La actividad se creó, pero no se pudo guardar en el banco', err.message),
        );
      }
      updateWizard({ name, generatedCode: activity.code, generatedActivityId: activity.id, documentName: null, templateId: null });
      window.location.href = '/docente/actividades/nueva/qr';
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo crear la actividad. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (wizard.questions.length === 0) return null;

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Configurar actividad</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">Definí curso, ventana horaria y política de intentos</div>

      <Stepper
        steps={[
          { label: 'Texto', state: 'done' },
          { label: 'Revisar', state: 'done' },
          { label: 'Configurar', state: 'current' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      <div className="form-group mb-3">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Curso de destino</label>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1.5">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Abre</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={wizard.availableFrom}
              onChange={(e) => {
                const value = e.target.value;
                // Si el cierre quedaba antes de la nueva fecha de apertura, se corre al mismo día.
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
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Cierra</label>
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
            Abre {whenLabel(wizard.availableFrom, wizard.startTime)} y cierra {whenLabel(endDate, wizard.endTime)} · dura{' '}
            <strong>{durationLabel(opensAt, closesAt)}</strong>
          </>
        ) : (
          'El cierre tiene que ser posterior a la apertura. Si termina después de las 00:00, elegí el día siguiente en «Cierra».'
        )}
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Política de intentos</label>
        <RadioGroup
          options={[
            { value: 'unico' as AttemptPolicy, label: 'Único intento' },
            { value: 'reintentos' as AttemptPolicy, label: 'Permitir reintentos' },
          ]}
          value={wizard.attemptPolicy}
          onChange={(value) => updateWizard({ attemptPolicy: value })}
        />
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Lectura</label>
        <RadioGroup
          options={[
            { value: 'LECTURA_PRIMERO' as ReadingMode, label: 'Primero leen el texto, después responden' },
            { value: 'DOCENTE_HABILITA' as ReadingMode, label: 'Leen y yo habilito las preguntas para todos' },
            { value: 'LIBRE' as ReadingMode, label: 'Texto y preguntas juntos' },
          ]}
          value={wizard.readingMode ?? 'LECTURA_PRIMERO'}
          onChange={(value) => updateWizard({ readingMode: value })}
        />
        <div className="text-[11px] text-text-ter mt-1">
          En cualquier modo podés pasar a todos a las preguntas desde el panel en vivo.
        </div>
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.showFeedback ?? true}
          onChange={(value) => updateWizard({ showFeedback: value })}
          label="Mostrar resultados al alumno al cerrar"
          description="Cuando cierres la actividad, cada alumno ve desde su celular qué respondió, cuáles acertó y la respuesta correcta. Las respuestas escritas muestran tu puntaje cuando las revises."
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.saveToBank ?? false}
          onChange={(value) => updateWizard({ saveToBank: value })}
          label="Guardar en el banco de la institución"
          description="Guarda el texto, las preguntas y el documento para que vos u otros docentes la reutilicen. No se borra al cerrar la actividad."
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <ToggleSwitch
          checked={wizard.readingHelp ?? true}
          onChange={(value) => updateWizard({ readingHelp: value })}
          label="Ayuda con el texto"
          description="Cada alumno puede preguntarle a la IA qué significa una palabra o una frase. No le responde las preguntas de la actividad, y vos ves sus dudas en el panel en vivo."
          size="sm"
        />
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Tipo de actividad</label>
        <RadioGroup
          options={[
            { value: '' as DiagnosticType | '', label: 'Actividad común' },
            { value: 'inicio' as DiagnosticType | '', label: 'Diagnóstica de inicio del ciclo' },
            { value: 'cierre' as DiagnosticType | '', label: 'Diagnóstica de cierre del ciclo' },
          ]}
          value={wizard.diagnosticType ?? ''}
          onChange={(value) => updateWizard({ diagnosticType: value || null })}
        />
        {wizard.diagnosticType && (
          <div className="text-[11px] text-text-sec mt-1.5">
            Habitar compara la diagnóstica de inicio con la de cierre para mostrar cuánto mejoró cada alumno en cada eje.
            Para que sean comparables, conviene usar textos de dificultad similar.
          </div>
        )}
      </div>

      <div className="form-group mb-4">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Nombre de la actividad (opcional)</label>
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
          Volver
        </a>
        <button
          onClick={handleSubmit}
          disabled={submitting || !wizard.courseId}
          className="bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {submitting ? 'Generando…' : 'Confirmar y generar QR'}
        </button>
      </div>
    </div>
  );
}
