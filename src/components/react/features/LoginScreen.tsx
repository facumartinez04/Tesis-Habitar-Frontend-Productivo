import { useState } from 'react';
import type { OAuthProviderId } from '../../../types/auth';
import { oauthLoginUrl } from '../../../services/authService';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';

function getErrorFromQuery(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('error');
}

export function LoginScreen() {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);
  const [error] = useState<string | null>(getErrorFromQuery);

  function handleLogin(provider: OAuthProviderId) {
    setLoadingProvider(provider);
    // CU-01-01: navegación completa — el backend redirige a la pantalla real de Google/Microsoft.
    window.location.href = oauthLoginUrl(provider);
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 min-h-screen bg-surface">
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
