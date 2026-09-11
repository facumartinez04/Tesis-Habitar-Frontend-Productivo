import React from 'react';

interface HabitarLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export function HabitarLoader({
  size = 'md',
  message = 'Cargando...',
  overlay = false,
  className = '',
}: HabitarLoaderProps) {
  const isFullscreen = size === 'fullscreen';

  const logoSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    fullscreen: 'w-16 h-16',
  };

  const ringSizes = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    fullscreen: 'w-28 h-28',
  };

  const content = (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Contenedor central con anillo orbital y logo animado */}
      <div className="relative flex items-center justify-center">
        {/* Halo de luz difuminada con efecto respiración */}
        <div
          className={`absolute rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 blur-xl animate-pulse ${ringSizes[size]}`}
        />

        {/* Anillo de giro orbital exterior con gradiente */}
        <svg
          className={`absolute animate-spin [animation-duration:2.8s] ${ringSizes[size]}`}
          viewBox="0 0 100 100"
          fill="none"
        >
          <defs>
            <linearGradient id="habitar-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F6E56" stopOpacity="0" />
              <stop offset="60%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#habitar-spinner-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="90 190"
          />
        </svg>

        {/* Segundo anillo sutil en sentido opuesto */}
        <svg
          className={`absolute animate-spin [animation-duration:4s] [animation-direction:reverse] opacity-40 ${ringSizes[size]}`}
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="currentColor"
            className="text-emerald-300 dark:text-emerald-700"
            strokeWidth="1.5"
            strokeDasharray="40 120"
          />
        </svg>

        {/* Logo oficial de Habitar en el centro */}
        <div
          className={`relative z-10 flex items-center justify-center p-2 rounded-2xl bg-white dark:bg-[#1A1E29] shadow-md border border-gray-100 dark:border-gray-800 transition-transform duration-300 ${logoSizes[size]}`}
        >
          <img
            src="/logo.svg"
            alt="Habitar"
            className="w-full h-full object-contain animate-pulse [animation-duration:2s]"
          />
        </div>
      </div>

      {/* Marca tipográfica y mensaje de carga */}
      {size !== 'sm' && (
        <div className="mt-4 text-center space-y-1.5">
          <div className="text-sm font-bold tracking-tight text-text-pri flex items-center justify-center gap-1">
            <span>Habi</span>
            <span className="text-emerald-700 dark:text-emerald-400">tar</span>
          </div>

          {message && (
            <p className="text-xs font-medium text-text-sec animate-pulse [animation-duration:2.5s]">
              {message}
            </p>
          )}

          {/* Tres puntos animados secuenciales */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/90 dark:bg-[#0E1017]/90 backdrop-blur-sm animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/80 dark:bg-[#0E1017]/80 backdrop-blur-xs rounded-xl animate-in fade-in duration-150">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12 flex items-center justify-center">
      {content}
    </div>
  );
}
