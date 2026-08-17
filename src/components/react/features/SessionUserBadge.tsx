import { useSession } from '../../../hooks/useSession';
import { LogoutButton } from './LogoutButton';

const roleBadgeLabel: Record<string, string> = {
  coordinador: 'Coordinador/a',
  admin: 'Admin',
};

export function SessionUserBadge() {
  const session = useSession();

  if (!session) {
    return <div className="w-[30px] h-[30px] rounded-full bg-gray-bg animate-pulse" />;
  }

  const roleBadge = roleBadgeLabel[session.user.role];

  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      {roleBadge && (
        <span className="hidden sm:inline bg-green-bg text-green-text text-[10px] font-medium px-2.5 py-[3px] rounded-full">{roleBadge}</span>
      )}
      <div className="flex items-center gap-2">
        <div className="w-[30px] h-[30px] rounded-full bg-green-dark flex items-center justify-center text-[11px] font-semibold text-green-light shrink-0">
          {session.user.initials}
        </div>
        <span className="text-xs text-text-sec hidden md:inline">{session.user.name}</span>
      </div>
      <LogoutButton />
    </div>
  );
}
