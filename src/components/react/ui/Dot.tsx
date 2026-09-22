const colors = {
  green: 'bg-green-mid',
  amber: 'bg-amber',
  red: 'bg-red',
};

interface DotProps {
  color?: keyof typeof colors;
  className?: string;
}

export function Dot({ color = 'green', className = '' }: DotProps) {
  return <span className={`w-2 h-2 rounded-full inline-block mr-[5px] shrink-0 ${colors[color]} ${className}`} />;
}
