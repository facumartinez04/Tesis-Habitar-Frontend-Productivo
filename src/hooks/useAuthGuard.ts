import { useEffect, useState } from 'react';
import type { Role } from '../types/auth';
import { useSession } from './useSession';
import { refreshSession } from '../services/authService';

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

    // Si no hay ninguna sesión activa en el navegador, redirige al login
    if (!session) {
      window.location.href = '/login';
      return;
    }

    // EL SUPER ADMINISTRADOR SIEMPRE TIENE ACCESO IRRESTRICTO A TODA LA PLATAFORMA
    // (Mis cursos, Alertas, Panel Institucional, Actividades, etc.)
    // Nunca debe ser deslogueado ni bloqueado por un guard de rol.
    if (session.user.role === 'admin') {
      return;
    }

    // Rol activo considerando si está navegando en modo impersonación
    const activeRole = (session.impersonatedRole || session.user.role) as Role;

    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed =
        allowedRoles.includes(activeRole) ||
        // Equivalencias de supervisión institucional
        (allowedRoles.includes('coordinador') && (activeRole === 'director' || activeRole === 'admin')) ||
        (allowedRoles.includes('director') && (activeRole === 'coordinador' || activeRole === 'admin'));

      if (!isAllowed) {
        window.location.href = '/login';
      }
    }
  }, [checked, session, allowedRoles]);

  return checked ? session : null;
}
