import { clearSession } from '../../../store/sessionStore';
import { logout } from '../../../services/authService';
import { t, useI18n } from '../../../i18n';

export function LogoutButton() {
  useI18n();
  async function handleLogout() {
    await logout();
    clearSession();
    window.location.href = '/login';
  }

  return (
    <button onClick={handleLogout} className="text-xs text-text-ter hover:text-text-pri transition-colors">
      {t('Cerrar sesión')}
    </button>
  );
}
