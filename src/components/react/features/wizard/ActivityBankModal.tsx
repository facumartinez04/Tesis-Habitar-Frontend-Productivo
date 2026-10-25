import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { HabitarLoader } from '../../ui/HabitarLoader';
import { Pagination } from '../../ui/Pagination';
import { usePagination } from '../../../../hooks/usePagination';
import { deleteActivityTemplate, listActivityTemplates, type ActivityTemplateSummary } from '../../../../services/activityService';
import { confirmDestructive, showError } from '../../../../lib/alerts';
import { t, useI18n } from '../../../../i18n';

interface ActivityBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (template: ActivityTemplateSummary) => void;
}

const AXIS: Record<string, string> = { LITERAL: 'Literal', INFERENCIAL: 'Inferencial', CRITICO: 'Crítico' };

export function ActivityBankModal({ isOpen, onClose, onPick }: ActivityBankModalProps) {
  useI18n();
  const [items, setItems] = useState<ActivityTemplateSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setItems(null);
    listActivityTemplates()
      .then(setItems)
      .catch((err: Error) => setError(err.message || t('No se pudo abrir el banco')));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const term = search.trim().toLowerCase();
  const filtered = (items ?? []).filter((entry) => !term || entry.name.toLowerCase().includes(term) || entry.authorName.toLowerCase().includes(term));
  const paged = usePagination(filtered, 8, term);

  async function remove(entry: ActivityTemplateSummary) {
    const ok = await confirmDestructive({ title: t('¿Quitar «{name}» del banco?', { name: entry.name }), text: t('Las actividades que ya se crearon con ella no cambian.'), confirmButtonText: t('Quitar') });
    if (!ok) return;
    try {
      await deleteActivityTemplate(entry.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== entry.id));
    } catch (err) {
      showError(t('No se pudo quitar'), err instanceof Error ? err.message : '');
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-label={t('Banco de actividades')}>
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-pri">{t('Banco de la institución')}</h2>
            <p className="text-xs text-text-sec mt-0.5">{t('Actividades que guardaron los docentes, con su texto y sus preguntas listas.')}</p>
          </div>
          <button onClick={onClose} aria-label={t('Cerrar')} className="text-text-ter hover:text-text-pri p-1 rounded-lg cursor-pointer">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-6 pt-4">
          <div className="relative">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Buscar por nombre o por docente…')}
              className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
              autoFocus
            />
          </div>
        </div>
        <div className="p-6 pt-3 overflow-y-auto flex-1">
          {error ? (
            <div className="text-xs text-red">{error}</div>
          ) : !items ? (
            <HabitarLoader size="sm" message={t('Abriendo el banco…')} />
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-text-sec py-8">
              {items.length === 0
                ? t('Todavía no hay actividades en el banco. Al crear una, marcá «Guardar en el banco de la institución».')
                : t('No hay actividades que coincidan con la búsqueda.')}
            </div>
          ) : (
            <ul className="space-y-2">
              {paged.pageItems.map((template) => (
                <li key={template.id} className="border border-gray-border dark:border-[#2D3342] rounded-xl p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text-pri">{template.name}</div>
                    <div className="text-[11px] text-text-sec mt-0.5">
                      {t('{educationLevel} · eje', { educationLevel: t(template.educationLevel) })}{' '}{t(AXIS[template.axis]) ?? template.axis}{' '}{t('· {questionCount} preguntas · {wordCount} palabras', { questionCount: template.questionCount, wordCount: template.wordCount })}
                      {template.hasDocument && <>{' '}{t('· con documento')}</>}
                    </div>
                    <div className="text-[10.5px] text-text-ter mt-0.5">
                      {template.mine ? t('Guardada por vos') : t('Guardada por {authorName}', { authorName: template.authorName })}{' '}{t('· usada {uses}', { uses: template.uses })}{' '}{template.uses === 1 ? t('vez') : t('veces')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPick(template)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      {t('Usar')}
                    </button>
                    {template.mine && (
                      <button type="button" onClick={() => remove(template)} className="text-[11px] text-text-sec hover:text-red-700 cursor-pointer">
                        {t('Quitar del banco')}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} onChange={paged.setPage} label={t('actividades')} />
        </div>
      </div>
    </div>
  );
}
