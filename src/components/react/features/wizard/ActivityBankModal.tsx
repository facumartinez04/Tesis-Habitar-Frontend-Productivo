import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { HabitarLoader } from '../../ui/HabitarLoader';
import { Pagination } from '../../ui/Pagination';
import { usePagination } from '../../../../hooks/usePagination';
import { deleteActivityTemplate, listActivityTemplates, type ActivityTemplateSummary } from '../../../../services/activityService';
import { confirmDestructive, showError } from '../../../../lib/alerts';

interface ActivityBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (template: ActivityTemplateSummary) => void;
}

const AXIS: Record<string, string> = { LITERAL: 'Literal', INFERENCIAL: 'Inferencial', CRITICO: 'Crítico' };

export function ActivityBankModal({ isOpen, onClose, onPick }: ActivityBankModalProps) {
  const [items, setItems] = useState<ActivityTemplateSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setItems(null);
    listActivityTemplates()
      .then(setItems)
      .catch((err: Error) => setError(err.message || 'No se pudo abrir el banco'));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const term = search.trim().toLowerCase();
  const filtered = (items ?? []).filter((t) => !term || t.name.toLowerCase().includes(term) || t.authorName.toLowerCase().includes(term));
  const paged = usePagination(filtered, 8, term);

  async function remove(t: ActivityTemplateSummary) {
    const ok = await confirmDestructive({ title: `¿Quitar «${t.name}» del banco?`, text: 'Las actividades que ya se crearon con ella no cambian.', confirmButtonText: 'Quitar' });
    if (!ok) return;
    try {
      await deleteActivityTemplate(t.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    } catch (err) {
      showError('No se pudo quitar', err instanceof Error ? err.message : '');
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-label="Banco de actividades">
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-pri">Banco de la institución</h2>
            <p className="text-xs text-text-sec mt-0.5">Actividades que guardaron los docentes, con su texto y sus preguntas listas.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-text-ter hover:text-text-pri p-1 rounded-lg cursor-pointer">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-6 pt-4">
          <div className="relative">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o por docente…"
              className="w-full pl-8 pr-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
              autoFocus
            />
          </div>
        </div>
        <div className="p-6 pt-3 overflow-y-auto flex-1">
          {error ? (
            <div className="text-xs text-red">{error}</div>
          ) : !items ? (
            <HabitarLoader size="sm" message="Abriendo el banco…" />
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-text-sec py-8">
              {items.length === 0
                ? 'Todavía no hay actividades en el banco. Al crear una, marcá «Guardar en el banco de la institución».'
                : 'No hay actividades que coincidan con la búsqueda.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {paged.pageItems.map((t) => (
                <li key={t.id} className="border border-gray-border dark:border-[#2D3342] rounded-xl p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text-pri">{t.name}</div>
                    <div className="text-[11px] text-text-sec mt-0.5">
                      {t.educationLevel} · eje {AXIS[t.axis] ?? t.axis} · {t.questionCount} preguntas · {t.wordCount} palabras
                      {t.hasDocument && <> · con documento</>}
                    </div>
                    <div className="text-[10.5px] text-text-ter mt-0.5">
                      {t.mine ? 'Guardada por vos' : `Guardada por ${t.authorName}`} · usada {t.uses} {t.uses === 1 ? 'vez' : 'veces'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPick(t)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Usar
                    </button>
                    {t.mine && (
                      <button type="button" onClick={() => remove(t)} className="text-[11px] text-text-sec hover:text-red-700 cursor-pointer">
                        Quitar del banco
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} onChange={paged.setPage} label="actividades" />
        </div>
      </div>
    </div>
  );
}
