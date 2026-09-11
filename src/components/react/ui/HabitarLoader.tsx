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

  // Dimensiones del contenedor SVG unificado
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    fullscreen: 'w-40 h-40',
  }[size];

  const showText = size !== 'sm';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* 
        SISTEMA VECTORIAL 100% UNIFICADO (128x128)
        Todos los elementos (órbita, tarjeta y logo) comparten el mismo sistema de coordenadas
        y su centro está anclado a (64, 64), eliminando cualquier posible descentrado.
      */}
      <div className={`relative flex items-center justify-center ${sizeClasses}`}>
        {/* Resplandor suave difuso en el fondo */}
        <div className="absolute inset-4 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 blur-2xl animate-pulse pointer-events-none" />

        <svg
          viewBox="0 0 128 128"
          className="w-full h-full relative z-10 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente luminoso para el arco que orbita */}
            <linearGradient id="habitar-orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
            </linearGradient>

            {/* Sombra suave de la tarjeta central */}
            <filter id="habitar-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 1. Anillo estático de guía - Centro exacto (64, 64), Radio 54 */}
          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="currentColor"
            className="text-emerald-900/15 dark:text-emerald-400/15"
            strokeWidth="2"
          />

          {/* 
            2. Anillo de órbita animado por stroke-dashoffset (Circunferencia = 2 * PI * 54 = 339.29)
            Al animar el offset y NO rotar la geometría, el centro NUNCA oscila ni se desplaza.
          */}
          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="url(#habitar-orbit-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="90 250"
            className="habitar-spin-dash"
          />

          {/* 
            3. Tarjeta Glassmórfica central: 
            Ancho 76, Alto 76.
            Posición: X = 64 - 38 = 26, Y = 64 - 38 = 26.
            Distancia al círculo (radio 54) es EXACTAMENTE 16 unidades en los 4 costados.
          */}
          <rect
            x="26"
            y="26"
            width="76"
            height="76"
            rx="22"
            filter="url(#habitar-card-shadow)"
            className="fill-white/95 dark:fill-[#161A23] stroke-gray-200/90 dark:stroke-emerald-500/35"
            strokeWidth="1.2"
          />

          {/* 
            4. Isotipo Oficial de Habitar integrado en el centro:
            Posición: X = 37, Y = 37, Ancho = 54, Alto = 54 (Centro exacto = 64, 64).
            ViewBox '36 34 184 184' centra milimétricamente el isotipo (128, 126).
          */}
          <svg
            x="37"
            y="37"
            width="54"
            height="54"
            viewBox="36 34 184 184"
            preserveAspectRatio="xMidYMid meet"
            className="overflow-visible"
          >
            {/* Libro abierto */}
            <g
              className="stroke-[#0F6E56] dark:stroke-[#34D399]"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
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

              {/* Columnas */}
              <line x1="94" y1="92" x2="94" y2="150" strokeWidth="11" />
              <line x1="162" y1="92" x2="162" y2="150" strokeWidth="11" />
            </g>

            {/* Techo y chimenea de la casa */}
            <g strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M 74 98 L 128 48 L 182 98"
                className="stroke-emerald-600 dark:stroke-emerald-400"
                strokeWidth="13"
                fill="none"
              />
              <path
                d="M 162 76 L 162 48 L 172 48 L 172 85"
                className="stroke-emerald-600 dark:stroke-emerald-400 fill-emerald-600 dark:fill-emerald-400"
                strokeWidth="7"
              />
            </g>
          </svg>
        </svg>
      </div>

      {/* Marca tipográfica y Mensaje de estado */}
      {showText && (
        <div className="mt-5 flex flex-col items-center justify-center text-center space-y-2 w-full">
          {/* Logo tipográfico */}
          <div className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white flex items-center justify-center leading-none text-center">
            <span>Habi</span>
            <span className="text-emerald-600 dark:text-emerald-400">tar</span>
          </div>

          {/* Mensaje descriptivo */}
          {message && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed text-center mx-auto">
              {message}
            </p>
          )}

          {/* Barra de progreso con efecto shimmer */}
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

      {/* Animación SVG dashoffset y Shimmer */}
      <style>{`
        .habitar-spin-dash {
          animation: habitar-dash-spin 1.6s linear infinite;
        }
        @keyframes habitar-dash-spin {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -340;
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
    <div className="min-h-[60vh] sm:min-h-[70vh] w-full flex flex-col items-center justify-center py-12">
      {content}
    </div>
  );
}
