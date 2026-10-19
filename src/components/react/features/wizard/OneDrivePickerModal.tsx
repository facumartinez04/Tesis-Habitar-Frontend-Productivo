import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { HabitarLoader } from '../../ui/HabitarLoader';
import { listFolder, readDriveFile, searchDrive, type DriveItem } from '../../../../lib/oneDrive';

interface OneDrivePickerModalProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPicked: (file: { name: string; text: string }) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Navegador de sólo lectura del OneDrive del docente: carpetas, búsqueda y elección de un archivo de texto. */
export function OneDrivePickerModal({ token, isOpen, onClose, onPicked }: OneDrivePickerModalProps) {
  const [path, setPath] = useState<{ id?: string; name: string }[]>([{ name: 'Mi OneDrive' }]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const current = path[path.length - 1];

  useEffect(() => {
    if (!isOpen || !token || searching) return;
    setLoading(true);
    setError(null);
    listFolder(token, current.id)
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, token, current.id, searching]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const q = query.trim();
    if (!q) {
      setSearching(false);
      return;
    }
    setSearching(true);
    setLoading(true);
    setError(null);
    try {
      setItems(await searchDrive(token, q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar en OneDrive.');
    } finally {
      setLoading(false);
    }
  }

  async function choose(item: DriveItem) {
    if (!token) return;
    if (item.isFolder) {
      setSearching(false);
      setQuery('');
      setPath((p) => [...p, { id: item.id, name: item.name }]);
      return;
    }
    if (!item.supported) return;
    setReading(item.id);
    setError(null);
    try {
      onPicked({ name: item.name, text: await readDriveFile(token, item) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setReading(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Elegir un archivo de OneDrive">
      <div className="bg-card-bg border border-gray-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-text-pri">
            <Icon name="cloud" size={16} />
            Elegí el texto desde OneDrive
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-text-ter hover:text-text-pri p-1 rounded-lg cursor-pointer">
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={runSearch} className="px-5 py-3 border-b border-gray-border flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ter" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre del archivo…"
              className="w-full pl-8 pr-2.5 py-1.5 border border-gray-border rounded-[6px] text-[12.5px]"
            />
          </div>
          <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-[6px] bg-green-dark text-white cursor-pointer">
            Buscar
          </button>
        </form>

        <div className="px-5 py-2 text-[11.5px] text-text-sec flex flex-wrap items-center gap-1">
          {searching ? (
            <>
              Resultados para «{query.trim()}» ·
              <button type="button" className="underline cursor-pointer" onClick={() => { setSearching(false); setQuery(''); }}>
                volver a las carpetas
              </button>
            </>
          ) : (
            path.map((p, i) => (
              <span key={`${p.id ?? 'root'}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-text-ter">/</span>}
                <button
                  type="button"
                  disabled={i === path.length - 1}
                  onClick={() => setPath((prev) => prev.slice(0, i + 1))}
                  className={i === path.length - 1 ? 'font-semibold text-text-pri' : 'hover:underline cursor-pointer'}
                >
                  {p.name}
                </button>
              </span>
            ))
          )}
        </div>

        {error && <div className="mx-5 mb-2 text-xs text-red bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</div>}

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="py-10 flex justify-center"><HabitarLoader size="md" message="Cargando OneDrive…" /></div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-sec">{searching ? 'No se encontraron archivos.' : 'Esta carpeta está vacía.'}</div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={(!item.isFolder && !item.supported) || reading !== null}
                    onClick={() => choose(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Icon name={item.isFolder ? 'folder' : 'fileText'} size={15} className={item.isFolder ? 'text-amber' : 'text-text-sec'} />
                    <span className="flex-1 min-w-0 truncate text-[12.5px] text-text-pri">{item.name}</span>
                    <span className="text-[11px] text-text-ter shrink-0">
                      {reading === item.id ? 'Leyendo…' : item.isFolder ? '' : item.supported ? formatSize(item.size) : 'Formato no admitido'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-gray-border text-[11px] text-text-ter">
          Se admiten Word (.docx), PDF y texto (.txt, .md). El archivo se lee en este dispositivo y no se guarda en Habitar.
        </div>
      </div>
    </div>
  );
}
