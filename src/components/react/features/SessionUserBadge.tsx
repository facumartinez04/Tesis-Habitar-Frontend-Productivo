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
    return <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />;
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
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Abrir menú de usuario"
        className="flex items-center gap-2.5 px-1.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-full bg-[#0F6E56] flex items-center justify-center text-[12px] font-bold text-white shadow-sm group-hover:shadow-md transition-shadow shrink-0">
          {session.user.initials}
        </div>
        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 hidden md:inline truncate max-w-[120px]">
          {session.user.name}
        </span>
        <Icon
          name="chevronDown"
          size={13}
          className={`text-gray-400 hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {session.user.name}
              </div>
              {session.user.email && (
                <div className="text-[11.5px] text-gray-400 truncate mt-0.5">
                  {session.user.email}
                </div>
              )}
              <div className="mt-2">
                <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  {roleBadge}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <Icon name="logOut" size={15} className="text-rose-500" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
