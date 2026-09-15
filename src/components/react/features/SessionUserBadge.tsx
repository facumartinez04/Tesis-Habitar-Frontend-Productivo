import { useState, useRef, useEffect } from 'react';
import { useSession } from '../../../hooks/useSession';
import { clearSession } from '../../../store/sessionStore';
import { Icon } from '../ui/Icon';

const roleBadgeLabel: Record<string, string> = {
  coordinador: 'Coordinador/a',
  director: 'Director/a',
  docente: 'Docente',
  admin: 'Admin',
};

export function SessionUserBadge() {
  const session = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!session) {
    return <div className="w-8 h-8 rounded-full bg-gray-bg animate-pulse" />;
  }

  const roleBadge = session.impersonatedRole
    ? `Admin (${roleBadgeLabel[session.impersonatedRole] || session.impersonatedRole})`
    : roleBadgeLabel[session.user.role] || session.user.role;

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Abrir menú de usuario"
        className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-600/40 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-all cursor-pointer group"
      >
        <div className="w-[32px] h-[32px] rounded-full bg-green-dark flex items-center justify-center text-[12px] font-semibold text-green-light shadow-2xs group-hover:scale-105 transition-transform shrink-0">
          {session.user.initials}
        </div>
        <span className="text-xs font-medium text-text-pri hidden md:inline truncate max-w-[120px]">
          {session.user.name}
        </span>
      </button>

      {}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-border rounded-xl shadow-lg p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {}
          <div className="px-2 py-1.5 space-y-1">
            <div className="text-xs font-bold text-text-pri truncate">
              {session.user.name}
            </div>
            {session.user.email && (
              <div className="text-[11px] text-text-sec truncate">
                {session.user.email}
              </div>
            )}
            <div className="pt-1">
              <span className="inline-block bg-green-bg text-green-text text-[10.5px] font-semibold px-2 py-0.5 rounded-full">
                {roleBadge}
              </span>
            </div>
          </div>

          {}
          <div className="my-1.5 border-t border-gray-border" />

          {}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-red hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer group"
          >
            <Icon name="logOut" size={14} className="text-red/70 group-hover:text-red transition-colors" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
