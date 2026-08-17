import { useEffect } from 'react';
import type { Role } from '../types/auth';
import { useSession } from './useSession';

export function useAuthGuard(allowedRoles?: Role[]) {
  const session = useSession();

  useEffect(() => {
    if (!session) {
      window.location.href = '/login';
      return;
    }
    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      window.location.href = '/login';
    }
  }, [session, allowedRoles]);

  return session;
}
