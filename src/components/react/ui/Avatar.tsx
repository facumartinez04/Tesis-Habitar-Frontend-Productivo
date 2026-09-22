interface AvatarProps {
  initials: string;
  bg?: string;
  color?: string;
  size?: number;
  className?: string;
}

export function Avatar({ initials, bg = '#085041', color = '#9FE1CB', size = 34, className = '' }: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, color, fontSize: size <= 30 ? 11 : 12 }}
    >
      {initials}
    </div>
  );
}
