import { clearSession } from '../../../store/sessionStore';

export function LogoutButton() {
  function handleLogout() {
    clearSession();
    window.location.href = '/login';
  }

  return (
    <button onClick={handleLogout} className="text-xs text-text-ter hover:text-text-pri transition-colors">
      Cerrar sesión
    </button>
  );
}
