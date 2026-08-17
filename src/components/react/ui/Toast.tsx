import { Icon } from './Icon';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-text-pri text-white px-5 py-2.5 rounded-lg text-xs transition-all pointer-events-none z-50 flex items-center gap-2 ${
        message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <Icon name="check" size={14} className="text-green-mid" />
      {message}
    </div>
  );
}
