import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { RadioGroup } from '../../ui/RadioGroup';
import { Stepper } from '../../ui/Stepper';
import { createActivity } from '../../../../services/activityService';
import { listMyCourses } from '../../../../services/courseService';
import { activityWizardStore, updateWizard, currentTimeInArgentina, defaultActivityWindow, todayInArgentina } from '../../../../store/activityWizardStore';
import type { AttemptPolicy, Course, DiagnosticType } from '../../../../types/activity';

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

  async function handleSubmit() {
    if (wizard.endTime <= wizard.startTime) {
      setSubmitError('[Error-PAR_002] El horario de cierre debe ser posterior al de inicio');
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
        endTime: wizard.endTime,
        attemptPolicy: wizard.attemptPolicy,
        questions: wizard.questions,
        diagnosticType: wizard.diagnosticType,
      });
      updateWizard({ name, generatedCode: activity.code, generatedActivityId: activity.id });
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Fecha de disponibilidad</label>
          <input
            type="date"
            value={wizard.availableFrom}
            onChange={(e) => updateWizard({ availableFrom: e.target.value })}
            className="w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
          />
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Horario (inicio → fin)</label>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={wizard.startTime}
              onChange={(e) => updateWizard({ startTime: e.target.value })}
              className="w-[100px] px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
            <Icon name="arrowRight" size={14} className="text-text-sec" />
            <input
              type="time"
              value={wizard.endTime}
              onChange={(e) => updateWizard({ endTime: e.target.value })}
              className="w-[100px] px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            />
          </div>
        </div>
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
