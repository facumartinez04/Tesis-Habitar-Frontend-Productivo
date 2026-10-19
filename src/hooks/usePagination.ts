import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiClient';

/** Página que devuelve la API cuando se le pasa `?page=`. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginación en pantalla de un listado ya cargado. Vuelve a la primera página cuando cambia `resetKey`
 * (por ejemplo, el texto de búsqueda) y nunca queda en una página que ya no existe.
 */
export function usePagination<T>(items: T[], pageSize = 10, resetKey: unknown = null) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const current = Math.min(page, totalPages);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  return { page: current, setPage, totalPages, total: items.length, pageSize, pageItems };
}

/**
 * Paginación en el servidor: pide `path?page=&pageSize=&q=` y mantiene la página, la búsqueda y la carga.
 * La búsqueda espera un momento a que se termine de escribir antes de pedir.
 */
export function useServerPage<T>(path: string | null, pageSize = 20) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const load = useCallback(() => {
    if (!path) return;
    const id = ++requestId.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q) params.set('q', q);
    apiFetch<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}${params.toString()}`)
      .then((res) => {
        if (id !== requestId.current) return;
        // Si se borró lo último de la página, se vuelve a la anterior.
        if (res.items.length === 0 && res.page > 1) {
          setPage(res.page - 1);
          return;
        }
        setData(res);
        setError(null);
      })
      .catch((err: Error) => id === requestId.current && setError(err.message || 'No se pudo cargar'))
      .finally(() => id === requestId.current && setLoading(false));
  }, [path, page, pageSize, q]);

  useEffect(load, [load]);

  return { data, loading, error, page, setPage, search, setSearch, reload: load, pageSize };
}
