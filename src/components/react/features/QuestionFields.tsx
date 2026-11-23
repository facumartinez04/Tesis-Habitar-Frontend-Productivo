import { useEffect, useLayoutEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { t, useI18n } from '../../../i18n';
import type { QuestionType } from '../../../types/question';

export interface QuestionDraft {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctOption: string;
  correctOptions: string[];
  acceptedAnswers: string[];
  expectedAnswer: string;
}

export function draftFromQuestion(q: {
  type?: QuestionType;
  prompt: string;
  options?: string[] | null;
  correctOption?: string | null;
  correctOptions?: string[] | null;
  acceptedAnswers?: string[] | null;
  expectedAnswer?: string;
}): QuestionDraft {
  const type: QuestionType = q.type ?? (q.options?.length ? 'OPCION_UNICA' : 'ABIERTA');
  return {
    type,
    prompt: q.prompt,
    options: q.options ?? [],
    correctOption: q.correctOption ?? '',
    correctOptions: q.correctOptions ?? [],
    acceptedAnswers: q.acceptedAnswers?.length ? q.acceptedAnswers : type === 'COMPLETAR' ? [q.expectedAnswer ?? ''] : [],
    expectedAnswer: q.expectedAnswer ?? '',
  };
}

export function QuestionPreview(q: {
  type?: QuestionType;
  options?: string[] | null;
  correctOption?: string | null;
  correctOptions?: string[] | null;
  acceptedAnswers?: string[] | null;
  expectedAnswer?: string;
}) {
  useI18n();
  const type: QuestionType = q.type ?? (q.options?.length ? 'OPCION_UNICA' : 'ABIERTA');
  if (type === 'ABIERTA') {
    return (
      <div className="text-xs text-text-sec mt-1.5">
        <span className="font-semibold">{t('Esperada:')}</span> {q.expectedAnswer}
      </div>
    );
  }
  if (type === 'COMPLETAR') {
    return (
      <div className="text-xs text-text-sec mt-1.5">
        <span className="font-semibold">{t('Respuestas aceptadas:')}</span> {(q.acceptedAnswers ?? [q.expectedAnswer ?? '']).join(' · ')}
      </div>
    );
  }
  const correct = type === 'OPCION_MULTIPLE' ? q.correctOptions ?? [] : [q.correctOption ?? ''];
  return (
    <ul className="mt-2 space-y-1">
      {(q.options ?? []).map((o) => (
        <li key={o} className={`text-xs flex items-center gap-1.5 ${correct.includes(o) ? 'text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-text-sec'}`}>
          {correct.includes(o) ? <Icon name="check" size={12} /> : <span className="w-3" />}
          {o}
        </li>
      ))}
    </ul>
  );
}

export function questionDraftProblem(draft: QuestionDraft): string | null {
  if (draft.prompt.trim().length < 3) return t('La consigna es demasiado corta');
  if (draft.type === 'ABIERTA') return null;
  if (draft.type === 'COMPLETAR') {
    return draft.acceptedAnswers.some((a) => a.trim()) ? null : t('Agregá al menos una respuesta aceptada');
  }
  const options = draft.options.map((o) => o.trim());
  if (options.length < 2 || options.some((o) => !o) || new Set(options).size !== options.length) {
    return t('Completá la consigna y opciones distintas entre sí.');
  }
  if (draft.type === 'OPCION_MULTIPLE') return draft.correctOptions.some((c) => options.includes(c.trim())) ? null : t('Marcá al menos una opción correcta');
  return options.includes(draft.correctOption.trim()) ? null : t('Marcá la opción correcta');
}

export function draftPayload(draft: QuestionDraft) {
  const options = draft.options.map((o) => o.trim());
  switch (draft.type) {
    case 'ABIERTA':
      return { prompt: draft.prompt.trim(), expectedAnswer: draft.expectedAnswer.trim() };
    case 'COMPLETAR': {
      const accepted = draft.acceptedAnswers.map((a) => a.trim()).filter(Boolean);
      return { prompt: draft.prompt.trim(), acceptedAnswers: accepted, expectedAnswer: accepted[0] ?? '' };
    }
    case 'OPCION_MULTIPLE': {
      const correct = draft.correctOptions.map((c) => c.trim()).filter((c) => options.includes(c));
      return { prompt: draft.prompt.trim(), options, correctOptions: correct, expectedAnswer: correct.join(' · ') };
    }
    default:
      return { prompt: draft.prompt.trim(), options, correctOption: draft.correctOption.trim(), expectedAnswer: draft.correctOption.trim() };
  }
}

const field =
  'w-full px-3 py-2 border border-gray-border dark:border-[#2D3342] rounded-lg text-[13px] leading-relaxed bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-colors';

/**
 * Cuadro de texto que crece con lo que se escribe: no corta el texto ni muestra barras de desplazamiento propias.
 * Con `singleLine` el Enter no agrega renglones (para opciones y respuestas cortas, que pueden ocupar varias líneas al verse).
 */
function AutoTextarea({
  value,
  onChange,
  minRows = 1,
  singleLine = false,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  singleLine?: boolean;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight no cuenta los bordes: se suman para que no se recorte la última línea.
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  };
  useLayoutEffect(fit, [value]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      rows={minRows}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\s*\n+\s*/g, ' ') : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') e.preventDefault();
        rest.onKeyDown?.(e);
      }}
      className={`${rest.className ?? field} resize-none overflow-hidden block`}
    />
  );
}

export function QuestionFields({ draft, onChange, idPrefix }: { draft: QuestionDraft; onChange: (draft: QuestionDraft) => void; idPrefix: string }) {
  useI18n();
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch });
  const fixedOptions = draft.type === 'VERDADERO_FALSO';

  function renameOption(i: number, value: string) {
    const before = draft.options[i];
    set({
      options: draft.options.map((o, j) => (j === i ? value : o)),
      correctOption: draft.correctOption === before ? value : draft.correctOption,
      correctOptions: draft.correctOptions.map((c) => (c === before ? value : c)),
    });
  }

  function removeOption(i: number) {
    const removed = draft.options[i];
    set({
      options: draft.options.filter((_, j) => j !== i),
      correctOption: draft.correctOption === removed ? '' : draft.correctOption,
      correctOptions: draft.correctOptions.filter((c) => c !== removed),
    });
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-[11px] text-text-sec mb-1 font-medium">{t('Consigna')}</span>
        <AutoTextarea value={draft.prompt} onChange={(prompt) => set({ prompt })} minRows={2} className={field} />
        {draft.type === 'COMPLETAR' && (
          <span className="block text-[11px] text-text-ter mt-1">{t('Marcá el espacio en blanco con ___ (tres guiones bajos).')}</span>
        )}
      </label>

      {draft.type === 'ABIERTA' && (
        <label className="block">
          <span className="block text-[11px] text-text-sec mb-1 font-medium">{t('Respuesta esperada (guía para la corrección)')}</span>
          <AutoTextarea value={draft.expectedAnswer} onChange={(expectedAnswer) => set({ expectedAnswer })} minRows={3} className={field} />
        </label>
      )}

      {draft.type === 'COMPLETAR' && (
        <fieldset>
          <legend className="block text-[11px] text-text-sec mb-1 font-medium">{t('Respuestas aceptadas (sin importar mayúsculas ni tildes)')}</legend>
          <div className="space-y-1.5">
            {draft.acceptedAnswers.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <AutoTextarea
                  value={a}
                  singleLine
                  onChange={(value) => set({ acceptedAnswers: draft.acceptedAnswers.map((x, j) => (j === i ? value : x)) })}
                  aria-label={t('Respuesta aceptada {value}', { value: i + 1 })}
                  className={field}
                />
                {draft.acceptedAnswers.length > 1 && (
                  <button type="button" onClick={() => set({ acceptedAnswers: draft.acceptedAnswers.filter((_, j) => j !== i) })} aria-label={t('Quitar')} title={t('Quitar')} className="text-text-ter hover:text-red p-1 cursor-pointer">
                    <Icon name="close" size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {draft.acceptedAnswers.length < 6 && (
            <button type="button" onClick={() => set({ acceptedAnswers: [...draft.acceptedAnswers, ''] })} className="mt-1.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
              {t('+ Agregar otra respuesta válida')}
            </button>
          )}
        </fieldset>
      )}

      {(draft.type === 'OPCION_UNICA' || draft.type === 'OPCION_MULTIPLE' || draft.type === 'VERDADERO_FALSO') && (
        <fieldset>
          <legend className="block text-[11px] text-text-sec mb-1 font-medium">
            {draft.type === 'OPCION_MULTIPLE' ? t('Opciones (marcá todas las correctas)') : t('Opciones (marcá la correcta)')}
          </legend>
          <div className="space-y-1.5">
            {draft.options.map((o, i) => {
              const multi = draft.type === 'OPCION_MULTIPLE';
              const checked = multi ? draft.correctOptions.includes(o) : draft.correctOption === o && o !== '';
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={`${idPrefix}-correct`}
                    checked={checked}
                    onChange={() =>
                      multi
                        ? set({ correctOptions: checked ? draft.correctOptions.filter((c) => c !== o) : [...draft.correctOptions, o] })
                        : set({ correctOption: o })
                    }
                    aria-label={t('Opción {value} es la correcta', { value: i + 1 })}
                    className="accent-emerald-700 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <AutoTextarea value={o} singleLine onChange={(value) => renameOption(i, value)} readOnly={fixedOptions} aria-label={t('Opción {value}', { value: i + 1 })} className={field} />
                  {!fixedOptions && draft.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} aria-label={t('Quitar')} title={t('Quitar')} className="text-text-ter hover:text-red p-1 cursor-pointer">
                      <Icon name="close" size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!fixedOptions && draft.options.length < 6 && (
            <button type="button" onClick={() => set({ options: [...draft.options, ''] })} className="mt-1.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
              {t('+ Agregar opción')}
            </button>
          )}
        </fieldset>
      )}
    </div>
  );
}
