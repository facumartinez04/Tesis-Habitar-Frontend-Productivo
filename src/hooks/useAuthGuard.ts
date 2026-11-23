import { useEffect, useState } from 'react';
import type { Role } from '../types/auth';
import { useSession } from './useSession';
import { dashboardPathForRole, refreshSession } from '../services/authService';

export function useAuthGuard(allowedRoles?: Role[]) {
  const session = useSession();
  const [checked, setChecked] = useState(false);

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

    if (session.user.role === 'admin') {
      return;
    }

    const activeRole = (session.impersonatedRole || session.user.role) as Role;

    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed =
        allowedRoles.includes(activeRole) ||

        (allowedRoles.includes('coordinador') && (activeRole === 'director' || activeRole === 'admin')) ||
        (allowedRoles.includes('director') && (activeRole === 'coordinador' || activeRole === 'admin'));

      if (!isAllowed) {
        const home = dashboardPathForRole(activeRole);
        window.location.href = home !== window.location.pathname ? home : '/login';
      }
    }
  }, [checked, session, allowedRoles]);

  return checked ? session : null;
}
