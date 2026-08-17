import { useState } from 'react';
import type { OAuthProviderId } from '../../../types/auth';
import { dashboardPathForRole, loginWithProvider } from '../../../services/authService';
import { sessionStore } from '../../../store/sessionStore';
import { GoogleIcon, MicrosoftIcon } from '../ui/BrandIcon';

export function LoginScreen() {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);

  async function handleLogin(provider: OAuthProviderId) {
    setLoadingProvider(provider);
    const session = await loginWithProvider(provider);
    sessionStore.set(session);
    window.location.href = dashboardPathForRole(session.user.role);
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

      <button
        disabled={loadingProvider !== null}
        onClick={() => handleLogin('google')}
        className="flex items-center gap-2.5 w-[280px] px-4 py-[11px] border border-gray-border rounded-md bg-white text-[13px] font-medium mb-2.5 hover:border-green-mid transition-colors disabled:opacity-60"
      >
        <GoogleIcon />
        {loadingProvider === 'google' ? 'Conectando…' : 'Continuar con Google Workspace'}
      </button>
      <button
        disabled={loadingProvider !== null}
        onClick={() => handleLogin('microsoft')}
        className="flex items-center gap-2.5 w-[280px] px-4 py-[11px] border border-gray-border rounded-md bg-white text-[13px] font-medium mb-2.5 hover:border-green-mid transition-colors disabled:opacity-60"
      >
        <MicrosoftIcon />
        {loadingProvider === 'microsoft' ? 'Conectando…' : 'Continuar con Microsoft 365'}
      </button>

      <div className="text-[11px] text-text-ter text-center max-w-[240px] mt-6 leading-relaxed">
        El acceso está disponible solo para instituciones registradas. Habitar nunca almacena contraseñas.
      </div>
    </div>
  );
}
