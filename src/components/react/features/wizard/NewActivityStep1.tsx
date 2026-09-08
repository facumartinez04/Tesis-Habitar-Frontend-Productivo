import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { generateQuestions, validateWordCount } from '../../../../services/aiService';
import { getCourseById } from '../../../../services/courseService';
import { activityWizardStore, resetWizard, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis, Course } from '../../../../types/activity';

const DEFAULT_TEXT =
  'La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para sobrevivir. Cuando una especie desaparece, las consecuencias se propagan en cadena hacia el resto del sistema. Proteger la biodiversidad no es solo una cuestión ambiental, sino también cultural y económica.';

export function NewActivityStep1() {
  const wizard = useStore(activityWizardStore);
  const [text, setText] = useState(wizard.sourceText || DEFAULT_TEXT);
  const [generating, setGenerating] = useState(false);
  const [boundCourse, setBoundCourse] = useState<Course | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseIdParam = params.get('courseId');
    const targetCourseId = courseIdParam || wizard.courseId;

    if (targetCourseId) {
      getCourseById(targetCourseId)
        .then((course) => {
          if (course) {
            setBoundCourse(course);
            updateWizard({
              courseId: course.id,
              courseName: course.name,
            });
          }
        })
        .catch(() => {
          // fallback if course cannot be fetched
        });
    }
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isValid = validateWordCount(wordCount);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
        updateWizard({ sourceText: content });
      }
    };
    reader.readAsText(file);
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateQuestions(text);
    updateWizard({
      sourceText: text,
      wordCount: result.wordCount,
      questions: result.questions,
    });
    setGenerating(false);
    window.location.href = '/docente/actividades/nueva/revisar';
  }

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Nueva actividad</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">Cargá el texto fuente para generar preguntas con IA</div>

      <Stepper
        steps={[
          { label: 'Texto', state: 'current' },
          { label: 'Revisar', state: 'pending' },
          { label: 'Configurar', state: 'pending' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      {/* Classroom Link Banner */}
      {(boundCourse || wizard.courseName) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
              <Icon name="school" size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-950 flex items-center gap-2">
                <span>Aula asignada: <strong>{boundCourse?.name || wizard.courseName}</strong></span>
                {boundCourse?.qrCode && (
                  <span className="text-[10.5px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-medium">
                    QR: {boundCourse.qrCode}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-700">
                {boundCourse?.room ? `Salón: ${boundCourse.room} · ` : ''}
                Esta actividad y sus preguntas quedarán vinculadas al aula fija.
              </div>
            </div>
          </div>
          <a
            href="/docente"
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline shrink-0"
          >
            Cambiar aula
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Nivel educativo</label>
          <select
            className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            value={wizard.educationLevel}
            onChange={(e) => updateWizard({ educationLevel: e.target.value })}
          >
            <option>Secundario — 4°</option>
            <option>Secundario — 5°</option>
            <option>Primario — 6°</option>
          </select>
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Eje de comprensión</label>
          <select
            className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            value={wizard.axis}
            onChange={(e) => updateWizard({ axis: e.target.value as ComprehensionAxis })}
          >
            <option value="inferencial">Inferencial</option>
            <option value="literal">Literal</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
      </div>

      <div className="form-group mb-2.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Texto fuente</label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-[6px] px-2.5 py-1.5 text-xs cursor-pointer font-medium transition-colors">
            <Icon name="fileText" size={13} />
            Subir archivo (.txt / .md)
            <input
              type="file"
              accept=".txt,.md,.text"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            type="button"
            onClick={() => { setText(DEFAULT_TEXT); resetWizard(); }}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-text-sec hover:text-text-pri"
          >
            <Icon name="refresh" size={12} />
            Texto de ejemplo
          </button>
          <button type="button" className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-text-sec">
            <Icon name="folder" size={13} />
            Google Drive
          </button>
          <button type="button" className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-text-sec">
            <Icon name="cloud" size={13} />
            OneDrive
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full px-2.5 py-2 border border-gray-border rounded-[6px] text-xs bg-white leading-relaxed resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5">
        <div className="text-[11.5px] text-text-sec">
          <span className={`font-semibold ${isValid ? 'text-green-mid' : 'text-red'}`}>{wordCount} palabras</span>
          {' · '}
          {isValid ? 'Rango válido para nivel seleccionado (40–600)' : 'El texto debe tener entre 40 y 600 palabras'}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!isValid || generating}
          className="flex items-center justify-center gap-1.5 bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {generating ? 'Generando…' : (
            <>
              Generar preguntas
              <Icon name="sparkles" size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
