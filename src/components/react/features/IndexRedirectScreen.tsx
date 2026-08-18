import { useEffect } from 'react';
import { sessionStore } from '../../../store/sessionStore';
import { dashboardPathForRole } from '../../../services/authService';

/**
 * Sitio estático sin redirect HTTP real: en vez de la página fallback fea
 * de Astro.redirect(), mostramos algo con la marca mientras decidimos
 * client-side adónde mandar (dashboard si ya hay sesión, si no /login).
 */
export function IndexRedirectScreen() {
  useEffect(() => {
    const session = sessionStore.get();
    const target = session ? dashboardPathForRole(session.user.role) : '/login';
    window.location.replace(target);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
      <div className="text-[28px] font-bold text-text-pri tracking-tight">
        Habi<span className="text-green-dark">tar</span>
      </div>
    </div>
  );
}
