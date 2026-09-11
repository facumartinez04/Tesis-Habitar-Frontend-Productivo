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

  // Configuración de escalas según tamaño
  const config = {
    sm: {
      container: 'w-16 h-16',
      badge: 'w-11 h-11 rounded-xl p-2',
      logoScale: 'scale-75',
      spinner: 'w-16 h-16',
      radius: 28,
      showText: false,
    },
    md: {
      container: 'w-24 h-24',
      badge: 'w-16 h-16 rounded-2xl p-3',
      logoScale: 'scale-90',
      spinner: 'w-24 h-24',
      radius: 42,
      showText: true,
    },
    lg: {
      container: 'w-32 h-32',
      badge: 'w-20 h-20 rounded-[22px] p-3.5',
      logoScale: 'scale-100',
      spinner: 'w-32 h-32',
      radius: 56,
      showText: true,
    },
    fullscreen: {
      container: 'w-32 h-32',
      badge: 'w-20 h-20 rounded-[22px] p-3.5',
      logoScale: 'scale-100',
      spinner: 'w-32 h-32',
      radius: 56,
      showText: true,
    },
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Zona Central: Orbita + Resplandor + Isotipo */}
      <div className={`relative flex items-center justify-center ${config.container}`}>
        {/* Resplandor ambiental de fondo (Glow) */}
        <div className="absolute inset-2 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 blur-2xl animate-pulse" />

        {/* Anillo de giro orbital SVG */}
        <svg
          className={`absolute inset-0 ${config.spinner} animate-spin`}
          style={{ animationDuration: '2s', animationTimingFunction: 'linear' }}
          viewBox="0 0 128 128"
          fill="none"
        >
          <defs>
            <linearGradient id="habitar-spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="habitar-trail-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Pista circular guía fija */}
          <circle
            cx="64"
            cy="64"
            r={config.radius}
            stroke="currentColor"
            className="text-emerald-900/10 dark:text-emerald-400/10"
            strokeWidth="2.5"
          />

          {/* Arco animado principal con gradiente */}
          <circle
            cx="64"
            cy="64"
            r={config.radius}
            stroke="url(#habitar-spin-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="80 280"
          />
        </svg>

        {/* Contenedor flotante del logo (Card Glassmórfica Premium) */}
        <div
          className={`relative z-10 flex items-center justify-center bg-white/95 dark:bg-[#161A23] border border-gray-200/80 dark:border-emerald-500/30 shadow-xl shadow-emerald-900/5 dark:shadow-emerald-950/40 backdrop-blur-md transition-transform duration-500 hover:scale-105 ${config.badge}`}
        >
          {/* Isotipo vectorial Habitar con gradiente adaptable para luz y oscuridad */}
          <svg
            viewBox="0 0 256 256"
            className={`w-full h-full transition-transform duration-700 animate-pulse ${config.logoScale}`}
            style={{ animationDuration: '2.5s' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="habitar-roof-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <linearGradient id="habitar-book-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F6E56" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="habitar-book-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {/* Símbolo: Libro Abierto (Fundamento del Saber) */}
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

            {/* Símbolo: Casa / Hogar (Techo + Chimenea con brillo esmeralda vivo) */}
            <g strokeLinecap="round" strokeLinejoin="round">
              {/* Techo distintivo */}
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

      {/* Marca tipográfica y Mensaje de estado */}
      {config.showText && (
        <div className="mt-5 flex flex-col items-center text-center space-y-2">
          {/* Logotipo Tipográfico: Habitar (sin separación de letras) */}
          <div className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white flex items-center leading-none">
            <span>Habi</span>
            <span className="text-emerald-600 dark:text-emerald-400">tar</span>
          </div>

          {/* Mensaje descriptivo */}
          {message && (
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              {message}
            </p>
          )}

          {/* Barra de progreso indeterminada sutil y moderna (estilo Apple/Vercel) */}
          <div className="w-28 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative mt-1">
            <div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 dark:from-emerald-400 dark:to-teal-300 w-1/2 animate-[shimmer_1.6s_ease-in-out_infinite]"
              style={{
                animation: 'habitar-slide 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* Keyframe inline para la barra de progreso */}
      <style>{`
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
    <div className="py-12 flex items-center justify-center w-full">
      {content}
    </div>
  );
}
