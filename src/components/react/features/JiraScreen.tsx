import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import type {
  JiraFiltersState,
  JiraIssue,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraToken,
} from '../../../types/jira';
import { jiraService } from '../../../services/jiraService';
import { SkeletonKanban } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { t, useI18n } from '../../../i18n';

const COLUMNS: { id: JiraStatus; title: string; accent: string }[] = [
  { id: 'todo', title: 'Por Hacer', accent: 'border-t-gray-400' },
  { id: 'in_progress', title: 'En Curso', accent: 'border-t-blue-500' },
  { id: 'review', title: 'En Revisión', accent: 'border-t-amber-500' },
  { id: 'done', title: 'Completado', accent: 'border-t-emerald-500' },
];

export function JiraScreen() {
  useI18n();
  useAuthGuard(['admin']);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<JiraStatus>('todo');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [notification, setNotification] = useState<string | null>(null);

  const [filters, setFilters] = useState<JiraFiltersState>({
    search: '',
    type: 'all',
    priority: 'all',
    status: 'all',
    tag: 'all',
    onlyMine: false,
    onlyUrgent: false,
    onlyOverdue: false,
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await jiraService.getIssues();
      setIssues(data);
    } catch {
      showToast(t('Error al conectar con el servidor'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !issue.id.toLowerCase().includes(q) &&
          !t(issue.title).toLowerCase().includes(q) &&
          !issue.description?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.type !== 'all' && issue.type !== filters.type) return false;
      if (filters.priority !== 'all' && issue.priority !== filters.priority) return false;
      if (filters.status !== 'all' && issue.status !== filters.status) return false;
      if (filters.onlyUrgent && issue.priority !== 'urgent') return false;
      return true;
    });
  }, [issues, filters]);
  const pagedFilteredIssues = usePagination(filteredIssues, 20, filters);

  const handleMove = async (id: string, newStatus: JiraStatus) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
    try {
      await jiraService.updateIssue(id, { status: newStatus });
    } catch {
      showToast(t('Error al actualizar'));
      loadIssues();
    }
  };

  const handleCreate = async (cardData: any) => {
    try {
      const created = await jiraService.createIssue(cardData);
      setIssues((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      showToast(t('Tarea {id} creada en PostgreSQL', { id: created.id }));
    } catch {
      showToast(t('Error al crear tarea'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('¿Eliminar la tarea {id}?', { id }))) return;
    try {
      await jiraService.deleteIssue(id);
      setIssues((prev) => prev.filter((i) => i.id !== id));
      setSelectedIssue(null);
      showToast(t('Tarea eliminada'));
    } catch {
      showToast(t('Error al eliminar'));
    }
  };

  if (loading) {
    return <HabitarLoader size="lg" message={t('Sincronizando tablero Jira de tareas y soporte...')} />;
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg">
          {notification}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('Jira de Administración')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('Tablero de incidencias y sprints persistido en PostgreSQL')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-800 text-white hover:bg-teal-900 transition-colors shadow-xs"
          >
            <KeyIcon />
            <span>{t('Tokens IA')}</span>
          </button>
          <button
            onClick={() => {
              setCreateInitialStatus('todo');
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
          >
            <PlusIcon />
            <span>{t('Nueva Incidencia')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            placeholder={t('Buscar por código (HAB-...) o título...')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
          >
            <option value="all">{t('Todas las prioridades')}</option>
            <option value="urgent">{t('Urgente')}</option>
            <option value="high">{t('Alta')}</option>
            <option value="medium">{t('Media')}</option>
            <option value="low">{t('Baja')}</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium"
          >
            {viewMode === 'board' ? t('Ver Lista') : t('Ver Tablero')}
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonKanban />
      ) : viewMode === 'board' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const colIssues = filteredIssues.filter((i) => i.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`w-72 bg-gray-100/90 rounded-xl border border-gray-200 border-t-4 ${col.accent} p-3 flex flex-col min-h-[480px]`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) handleMove(id, col.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      {t(col.title)}
                    </span>
                    <span className="text-[11px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded-full shadow-2xs">
                      {colIssues.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {colIssues.map((issue) => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', issue.id)}
                        onClick={() => setSelectedIssue(issue)}
                        className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs hover:shadow-sm cursor-pointer transition-all space-y-2 hover:border-teal-600"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-800">{issue.id}</span>
                          <span className="text-[10px] font-semibold text-gray-400 capitalize">
                            {issue.priority}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-800 line-clamp-2">
                          {t(issue.title)}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                          <span>{issue.type}</span>
                          <div className="w-5 h-5 rounded-full bg-teal-700 text-white text-[9px] font-bold flex items-center justify-center">
                            {issue.assignee?.initials || 'AD'}
                          </div>
                        </div>
                      </div>
                    ))}

                    {colIssues.length === 0 && (
                      <div className="py-12 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
                        {t('Arrastrá tarjetas aquí')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
              <tr>
                <th className="py-3 px-4">{t('Código')}</th>
                <th className="py-3 px-4">{t('Título')}</th>
                <th className="py-3 px-4">{t('Estado')}</th>
                <th className="py-3 px-4">{t('Prioridad')}</th>
                <th className="py-3 px-4">{t('Tipo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedFilteredIssues.pageItems.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-bold text-teal-800">{issue.id}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{t(issue.title)}</td>
                  <td className="py-3 px-4 capitalize text-gray-600">{issue.status}</td>
                  <td className="py-3 px-4 capitalize text-gray-600">{issue.priority}</td>
                  <td className="py-3 px-4 capitalize text-gray-500">{issue.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagedFilteredIssues.page} totalPages={pagedFilteredIssues.totalPages} total={pagedFilteredIssues.total} pageSize={pagedFilteredIssues.pageSize} onChange={pagedFilteredIssues.setPage} label={t('tarjetas')} />
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-900">{t('Nueva Incidencia')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                handleCreate({
                  title: form.title.value,
                  description: form.description.value,
                  priority: form.priority.value,
                  type: form.type.value,
                  status: createInitialStatus,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t('Título')}</label>
                <input
                  name="title"
                  required
                  placeholder={t('Ej: Implementar endpoint de analíticas')}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t('Descripción')}</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t('Prioridad')}</label>
                  <select name="priority" className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white">
                    <option value="medium">{t('Media')}</option>
                    <option value="urgent">{t('Urgente')}</option>
                    <option value="high">{t('Alta')}</option>
                    <option value="low">{t('Baja')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t('Tipo')}</label>
                  <select name="type" className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white">
                    <option value="task">{t('Tarea')}</option>
                    <option value="story">{t('Historia')}</option>
                    <option value="bug">{t('Bug')}</option>
                    <option value="epic">{t('Épica')}</option>
                    <option value="improvement">{t('Mejora')}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t('Cancelar')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800"
                >
                  {t('Crear Incidencia')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-bold text-teal-800">{selectedIssue.id}</span>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-gray-400 hover:text-gray-700 text-sm"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <h3 className="text-base font-bold text-gray-900">{t(selectedIssue.title)}</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
              {selectedIssue.description || t('Sin descripción adicional.')}
            </p>
            <div className="flex items-center justify-between pt-4 border-t text-xs">
              <button
                onClick={() => handleDelete(selectedIssue.id)}
                className="text-red-600 hover:text-red-800 font-semibold"
              >
                {t('Eliminar Incidencia')}
              </button>
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-1.5 bg-gray-100 rounded-lg font-medium"
              >
                {t('Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTokenModalOpen && (
        <TokenModal onClose={() => setIsTokenModalOpen(false)} />
      )}
    </div>
  );
}

function TokenModal({ onClose }: { onClose: () => void }) {
  useI18n();
  const [tokens, setTokens] = useState<JiraToken[]>([]);
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    jiraService.getTokens().then(setTokens);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await jiraService.createToken(name.trim() || t('AI Jira Agent'));
    setNewToken(created.token);
    setName('');
    jiraService.getTokens().then(setTokens);
  };

  const handleRevoke = async (id: string) => {
    await jiraService.deleteToken(id);
    jiraService.getTokens().then(setTokens);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-gray-900">{t('Access Tokens para IA')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm">
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            placeholder={t('Nombre del agente (ej. Asistente de tareas)')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-teal-800 text-white text-xs font-semibold rounded-lg hover:bg-teal-900 shrink-0"
          >
            {t('Generar Token')}
          </button>
        </form>

        {newToken && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-1">
            <p className="text-[11px] font-bold text-emerald-800">{t('¡Token creado exitosamente!')}</p>
            <code className="text-xs font-mono font-bold text-emerald-950 block select-all bg-white p-2 rounded border border-emerald-200">
              {newToken}
            </code>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700">{t('Tokens activos en PostgreSQL:')}</p>
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 border rounded-lg">
            {tokens.map((tokenItem) => (
              <div key={tokenItem.id} className="p-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-800">{tokenItem.name}</span>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {tokenItem.token.slice(0, 16)}...
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(tokenItem.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  {t('Revocar')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-1.5 text-xs bg-gray-100 rounded-lg">
            {t('Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyIcon() {
  useI18n();
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function PlusIcon() {
  useI18n();
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
