import { useEffect, useState } from 'react';
import { completeOAuthCallback } from '../../../services/authService';

/** CU-01-01: el backend redirige acá después del login real con `?token=&dashboardPath=`. */
export function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const dashboardPath = params.get('dashboardPath') ?? '/docente/cursos';

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
