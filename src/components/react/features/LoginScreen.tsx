import { useEffect, useState } from 'react';
import type { OAuthProviderId } from '../../../types/auth';
import { oauthLoginUrl } from '../../../services/authService';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';

const ERROR_MESSAGES: Record<string, string> = {
  institution_not_allowed: 'Tu institución no está habilitada en Habitar. Contactá a tu coordinador/a.',
  account_disabled: 'Tu cuenta fue desactivada. Contactá a tu coordinador/a.',
  invalid_tenant: 'El email no corresponde a la institución registrada.',
  unauthorized: 'No se pudo validar la sesión con el proveedor de login.',
  auth_failed: 'Ocurrió un error al intentar iniciar sesión. Por favor, intentá nuevamente.',
  session_expired: 'La sesión de login expiró, intentá de nuevo.',
};

export function LoginScreen() {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);
  // El ?error= de la URL se lee recién en useEffect (post-hidratación): leerlo durante
  // el render inicial rompe la hidratación, porque el server no tiene `window` y arma
  // un HTML distinto al que arma el cliente en su primer render.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawError = new URLSearchParams(window.location.search).get('error');
    if (rawError) {
      setError(ERROR_MESSAGES[rawError] || rawError);
      // Limpia el ?error=... de la barra de direcciones para que no quede visible en la URL
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // no-op
      }
    }
  }, []);

  function handleLogin(provider: OAuthProviderId) {
    setLoadingProvider(provider);
    // CU-01-01: navegación completa — el backend redirige a la pantalla real de Google/Microsoft.
    window.location.href = oauthLoginUrl(provider);
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 min-h-screen bg-surface">
      <img
        src="/logo.svg"
        alt="Habitar"
        className="w-20 h-20 rounded-2xl object-contain shadow-md mb-4 border border-gray-border/70 bg-white p-2"
      />
      <div className="text-[36px] font-bold text-text-pri tracking-tight mb-1">
        Habi<span className="text-green-dark">tar</span>
      </div>
      <div className="text-[13px] text-text-sec mb-9 text-center">
        Analítica de comprensión lectora
        <br />
        para instituciones educativas
      </div>

      {error && (
        <div className="w-[280px] text-[11.5px] text-red-800 bg-red-100 rounded-md px-3 py-2 mb-4 text-center">{error}</div>
      )}

      <button
        disabled={loadingProvider !== null}
        onClick={() => handleLogin('google')}
        className="flex items-center gap-2.5 w-[280px] px-4 py-[11px] border border-gray-border rounded-md bg-white text-[13px] font-medium mb-2.5 hover:border-green-mid transition-colors disabled:opacity-60"
      >
        <GoogleIcon />
        {loadingProvider === 'google' ? 'Conectando…' : 'Continuar con Google Workspace'}
      </button>
      <button
        disabled
        title="Todavía no está disponible"
        className="flex items-center gap-2.5 w-[280px] px-4 py-[11px] border border-gray-border rounded-md bg-white text-[13px] font-medium mb-2.5 opacity-50 cursor-not-allowed"
      >
        <MicrosoftIcon />
        <span className="flex-1 text-left">Continuar con Microsoft 365</span>
        <span className="text-[10px] text-text-ter">Próximamente</span>
      </button>

      <div className="text-[11px] text-text-ter text-center max-w-[240px] mt-6 leading-relaxed">
        El acceso está disponible solo para instituciones registradas. Habitar nunca almacena contraseñas.
      </div>
    </div>
  );
}
