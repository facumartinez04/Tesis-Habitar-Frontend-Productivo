import { useState } from 'react';

export function useQueryParam(key: string, fallback = ''): string {
  const [value] = useState(() => {
    if (typeof window === 'undefined') return fallback;
    return new URLSearchParams(window.location.search).get(key) ?? fallback;
  });
  return value;
}
