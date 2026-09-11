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

  // Proporciones calibradas para alineación y concentricidad matemática
  const config = {
    sm: {
      container: 'w-16 h-16',
      badge: 'w-11 h-11 rounded-xl p-2',
      radius: 28,
      showText: false,
    },
    md: {
      container: 'w-24 h-24',
      badge: 'w-16 h-16 rounded-2xl p-3',
      radius: 42,
      showText: true,
    },
    lg: {
      container: 'w-32 h-32',
      badge: 'w-20 h-20 rounded-[22px] p-3.5',
      radius: 54,
      showText: true,
    },
    fullscreen: {
      container: 'w-32 h-32',
      badge: 'w-20 h-20 rounded-[22px] p-3.5',
      radius: 54,
      showText: true,
    },
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Zona Central: Órbita concéntrica + Halo + Badge centrado */}
      <div className={`relative flex items-center justify-center ${config.container}`}>
        {/* Resplandor ambiental de fondo perfectamente concéntrico */}
        <div className="absolute inset-2 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 blur-xl animate-pulse pointer-events-none" />

        {/* Órbita SVG con rotación interna centrada en (64, 64) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 128 128"
          fill="none"
        >
          <defs>
            <linearGradient id="habitar-spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Anillo guía estático concéntrico */}
          <circle
            cx="64"
            cy="64"
            r={config.radius}
            stroke="currentColor"
            className="text-emerald-900/10 dark:text-emerald-400/10"
            strokeWidth="2"
          />

          {/* Anillo activo girando sobre el centro matemático (64, 64) */}
          <g style={{ transformOrigin: '64px 64px', animation: 'habitar-orbit 1.8s linear infinite' }}>
            <circle
              cx="64"
              cy="64"
              r={config.radius}
              stroke="url(#habitar-spin-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="75 260"
            />
          </g>
        </svg>

        {/* Tarjeta Glassmórfica central alineada al centro */}
        <div
          className={`relative z-10 flex items-center justify-center bg-white/95 dark:bg-[#161A23] border border-gray-200/80 dark:border-emerald-500/30 shadow-xl shadow-emerald-900/5 dark:shadow-emerald-950/40 backdrop-blur-md ${config.badge}`}
        >
          {/* Isotipo vectorial Habitar: viewBox acotado para centrado milimétrico */}
          <svg
            viewBox="36 40 184 172"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full animate-pulse"
            style={{ animationDuration: '2.5s' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Libro Abierto */}
            <g
              className="stroke-[#0F6E56] dark:stroke-[#34D399] transition-colors duration-300"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Cubierta exterior */}
              <path d="M 44 60 L 44 168 C 72 172, 102 184, 128 202 C 154 184, 184 172, 212 168 L 212 60" />

              {/* Páginas interiores */}
              <path
                d="M 128 72 C 104 50, 74 46, 56 46 L 56 156 C 78 156, 106 166, 128 186 C 150 166, 178 156, 200 156 L 200 46 C 182 46, 152 50, 128 72 Z"
                strokeWidth="10"
              />

              {/* Hojas inferiores */}
              <path d="M 56 156 C 78 160, 106 172, 128 190 C 150 172, 178 160, 200 156" />
              <path d="M 44 168 C 72 174, 102 188, 128 204 C 154 188, 184 174, 212 168" />

              {/* Columnas de soporte */}
              <line x1="94" y1="92" x2="94" y2="150" strokeWidth="11" />
              <line x1="162" y1="92" x2="162" y2="150" strokeWidth="11" />
            </g>

            {/* Casa / Hogar (Techo + Chimenea) */}
            <g strokeLinecap="round" strokeLinejoin="round">
              {/* Techo */}
              <path
                d="M 74 98 L 128 48 L 182 98"
                className="stroke-emerald-600 dark:stroke-emerald-400"
                strokeWidth="13"
              />
              {/* Chimenea */}
              <path
                d="M 162 76 L 162 48 L 172 48 L 172 85"
                className="stroke-emerald-600 dark:stroke-emerald-400 fill-emerald-600 dark:fill-emerald-400"
                strokeWidth="7"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Tipografía de marca y Estado centrados */}
      {config.showText && (
        <div className="mt-5 flex flex-col items-center justify-center text-center space-y-2 w-full">
          {/* Logo tipográfico sin separación */}
          <div className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-white flex items-center justify-center leading-none text-center">
            <span>Habi</span>
            <span className="text-emerald-600 dark:text-emerald-400">tar</span>
          </div>

          {/* Mensaje descriptivo centrado */}
          {message && (
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed text-center mx-auto">
              {message}
            </p>
          )}

          {/* Barra shimmer de progreso centrada */}
          <div className="w-28 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative mt-1 mx-auto">
            <div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 dark:from-emerald-400 dark:to-teal-300 w-1/2"
              style={{
                animation: 'habitar-slide 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Keyframes de animación inline */}
      <style>{`
        @keyframes habitar-orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes habitar-slide {
          0% {
            left: -40%;
            width: 30%;
          }
          50% {
            left: 35%;
            width: 50%;
          }
          100% {
            left: 100%;
            width: 30%;
          }
        }
      `}</style>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-[#0E1017]/90 backdrop-blur-md animate-in fade-in duration-300">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 dark:bg-[#0E1017]/80 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-[55vh] sm:min-h-[65vh] w-full flex flex-col items-center justify-center py-12">
      {content}
    </div>
  );
}
