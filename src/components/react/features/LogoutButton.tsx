import { clearSession } from '../../../store/sessionStore';
import { logout } from '../../../services/authService';

export function LogoutButton() {
  async function handleLogout() {
    await logout();
    clearSession();
    window.location.href = '/login';
  }

  return (
    <button onClick={handleLogout} className="text-xs text-text-ter hover:text-text-pri transition-colors">
      Cerrar sesión
    </button>
  );
}
