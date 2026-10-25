import React, { useEffect, useState } from 'react';
import { t, useI18n } from '../../../i18n';

interface HabitarLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  message?: string;
  overlay?: boolean;
  className?: string;
  autoFullscreenOnInitialLoad?: boolean;
}

export function HabitarLoader({
  size = 'md',
  message = t('Cargando...'),
  overlay = false,
  className = '',
  autoFullscreenOnInitialLoad = true,
}: HabitarLoaderProps) {
  useI18n();

  const [isInitialWebLoad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const g = window as any;
    return !g.__habitar_app_initialized;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const g = window as any;
    const timer = setTimeout(() => {
      g.__habitar_app_initialized = true;
    }, 1200);
    return () => {
      clearTimeout(timer);
      g.__habitar_app_initialized = true;
    };
  }, []);

  const shouldBeFullscreen =
    size === 'fullscreen' ||
    (autoFullscreenOnInitialLoad && isInitialWebLoad && !overlay && size !== 'sm');

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    fullscreen: 'w-40 h-40',
  }[size];

  const showText = size !== 'sm';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <div className={`relative flex items-center justify-center ${sizeClasses}`}>
        <div className="absolute inset-4 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 blur-2xl animate-pulse pointer-events-none" />

        <svg
          viewBox="0 0 128 128"
          className="w-full h-full relative z-10 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="habitar-orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
            </linearGradient>

            <filter id="habitar-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="currentColor"
            className="text-emerald-900/15 dark:text-emerald-400/15"
            strokeWidth="2"
          />

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

          <svg
            x="37"
            y="37"
            width="54"
            height="54"
            viewBox="36 34 184 184"
            preserveAspectRatio="xMidYMid meet"
            className="overflow-visible"
          >
            <g
              className="stroke-[#0F6E56] dark:stroke-[#34D399]"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M 44 60 L 44 168 C 72 172, 102 184, 128 202 C 154 184, 184 172, 212 168 L 212 60" />

              <path
                d="M 128 72 C 104 50, 74 46, 56 46 L 56 156 C 78 156, 106 166, 128 186 C 150 166, 178 156, 200 156 L 200 46 C 182 46, 152 50, 128 72 Z"
                strokeWidth="10"
              />

              <path d="M 56 156 C 78 160, 106 172, 128 190 C 150 172, 178 160, 200 156" />
              <path d="M 44 168 C 72 174, 102 188, 128 204 C 154 188, 184 174, 212 168" />

              <line x1="94" y1="92" x2="94" y2="150" strokeWidth="11" />
              <line x1="162" y1="92" x2="162" y2="150" strokeWidth="11" />
            </g>

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

      {showText && (
        <div className="mt-5 flex flex-col items-center justify-center text-center space-y-2 w-full">
          <div className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white flex items-center justify-center leading-none text-center">
            <span>Habi</span>
            <span className="text-emerald-600 dark:text-emerald-400">tar</span>
          </div>

          {message && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed text-center mx-auto">
              {message}
            </p>
          )}

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

  if (shouldBeFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/98 dark:bg-[#0D0F14]/98 backdrop-blur-md animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/80 dark:bg-[#0D0F14]/80 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-[45vh] sm:min-h-[55vh] w-full flex flex-col items-center justify-center py-8">
      {content}
    </div>
  );
}
