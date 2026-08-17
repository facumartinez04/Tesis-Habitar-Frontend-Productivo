import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { generateQuestions, validateWordCount } from '../../../../services/aiService';
import { activityWizardStore, resetWizard, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis } from '../../../../types/activity';

const DEFAULT_TEXT =
  'La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para sobrevivir. Cuando una especie desaparece, las consecuencias se propagan en cadena hacia el resto del sistema. Proteger la biodiversidad no es solo una cuestión ambiental, sino también cultural y económica.';

export function NewActivityStep1() {
  const wizard = useStore(activityWizardStore);
  const [text, setText] = useState(wizard.sourceText || DEFAULT_TEXT);
  const [generating, setGenerating] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isValid = validateWordCount(wordCount);

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
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() => { setText(DEFAULT_TEXT); resetWizard(); }}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs"
          >
            <Icon name="folder" size={13} />
            Google Drive
          </button>
          <button type="button" className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs">
            <Icon name="cloud" size={13} />
            OneDrive
          </button>
          <button type="button" className="bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs">Pegar texto</button>
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
