import { useCallback, useRef, useState } from 'react';

export type ToastKind = 'success' | 'error';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<ToastKind>('success');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, toastKind: ToastKind = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setKind(toastKind);
    setMessage(text);
    timeoutRef.current = setTimeout(() => setMessage(null), toastKind === 'error' ? 5000 : 2800);
  }, []);

  return { message, kind, showToast };
}
