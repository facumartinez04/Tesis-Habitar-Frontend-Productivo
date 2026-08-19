import { useEffect, useState } from 'react';
import type { Role } from '../types/auth';
import { useSession } from './useSession';
import { refreshSession } from '../services/authService';

export function useAuthGuard(allowedRoles?: Role[]) {
  const session = useSession();
  const [checked, setChecked] = useState(false);

  // El rol/institución guardados en localStorage pueden haber quedado desactualizados si un
  // admin cambió el rol de este usuario en otra sesión: el JWT cacheado sigue siendo válido,
  // pero lo que puede hacer con él ya no. Antes de decidir si lo dejamos entrar, le pedimos al
  // backend el estado actual (fuente de verdad) y actualizamos la sesión local con eso.
  useEffect(() => {
    let cancelled = false;
    refreshSession().finally(() => {
      if (!cancelled) setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!session) {
      window.location.href = '/login';
      return;
    }
    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      window.location.href = '/login';
    }
  }, [checked, session, allowedRoles]);

  return checked ? session : null;
}
