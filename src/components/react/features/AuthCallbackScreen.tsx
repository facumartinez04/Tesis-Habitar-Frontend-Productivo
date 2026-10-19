import { useEffect, useState } from 'react';
import { completeOAuthCallback } from '../../../services/authService';

export function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // El token llega en el fragmento (#), que el navegador no envía a ningún servidor. Se borra de la barra
    // de direcciones apenas se lee, para que no quede en el historial.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    const requested = params.get('dashboardPath') ?? '/docente/cursos';
    const dashboardPath = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/docente/cursos';
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      window.location.replace('/login?error=Falta el token de sesión');
      return;
    }

    completeOAuthCallback(token)
      .then(() => window.location.replace(dashboardPath))
      .catch(() => {
        setError('No se pudo completar el inicio de sesión');
        setTimeout(() => window.location.replace('/login'), 2000);
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="text-[13px] text-text-sec">{error ?? 'Iniciando sesión…'}</div>
    </div>
  );
}
