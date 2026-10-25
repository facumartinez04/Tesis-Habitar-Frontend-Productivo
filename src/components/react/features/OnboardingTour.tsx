import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t, useI18n } from '../../../i18n';
import { useSession } from '../../../hooks/useSession';

export interface TourStep {
  target?: string;
  title: string;
  body: string;
}

interface OnboardingTourProps {
  tourId: 'docente' | 'institucional';
  steps: TourStep[];
}

export const TOUR_START_EVENT = 'habitar-start-tour';

declare global {
  interface Window {
    __habitarTour?: string;
  }
}

export function teacherTourSteps(): TourStep[] {
  return [
    {
      title: '¡Te damos la bienvenida a Habitar!',
      body: 'En un minuto te mostramos cómo está organizado tu panel. Podés salir cuando quieras y volver a verlo con el botón «Recorrido» de la barra superior.',
    },
    {
      target: '#app-sidebar nav',
      title: 'Menú del docente',
      body: 'Desde acá vas a tus aulas, creás una actividad nueva o abrís el tablero con los gráficos de comprensión.',
    },
    {
      target: '[data-tour="course-cards"]',
      title: 'Tus aulas',
      body: 'Cada tarjeta es un aula física. Entrá a una para ver los resultados de los alumnos, sus actividades y las respuestas que faltan revisar.',
    },
    {
      target: '[data-tour="scan-qr"]',
      title: 'Escanear el QR del aula',
      body: 'Si estás en el salón, escaneá el QR fijo del aula para abrirla directamente.',
    },
    {
      target: '#app-sidebar a[href="/docente/actividades/nueva"]',
      title: 'Crear una actividad',
      body: 'Subí o pegá un texto, la IA propone preguntas de los tres ejes y vos las revisás antes de publicarlas. Los alumnos entran con el QR, sin cuenta ni contraseña.',
    },
    {
      target: '#app-sidebar a[href="/docente/dashboard"]',
      title: 'Tablero',
      body: 'Gráficos de la evolución por eje, por aula y por alumno, con un informe en PDF para compartir.',
    },
    {
      target: '[data-tour="header-tools"]',
      title: 'Idioma, tema y recorrido',
      body: 'Cambiá el idioma de la plataforma y el modo claro u oscuro. El idioma que elijas queda guardado en tu cuenta.',
    },
    {
      title: 'Ayuda en cada sección',
      body: 'Cuando veas el símbolo «?», pasá el mouse o tocalo para leer para qué sirve esa parte. ¡Listo, ya podés empezar!',
    },
  ];
}

export function institutionTourSteps(): TourStep[] {
  return [
    {
      title: '¡Te damos la bienvenida al panel institucional!',
      body: 'Te mostramos cómo seguir la comprensión lectora de toda la institución. Podés salir cuando quieras y volver a verlo con el botón «Recorrido» de la barra superior.',
    },
    {
      target: '#app-sidebar nav',
      title: 'Menú institucional',
      body: 'Desde acá gestionás las aulas, las finanzas, los costos de IA, las alertas, los datos personales, las bitácoras y la configuración.',
    },
    {
      target: '[data-tour="inst-metrics"]',
      title: 'Promedios de la institución',
      body: 'Los tres ejes de comprensión promediados entre todos los cursos y el total de actividades creadas.',
    },
    {
      target: '[data-tour="inst-filter"]',
      title: 'Filtrar por estado',
      body: 'Mostrá sólo los cursos que están bien, regular o en riesgo.',
    },
    {
      target: '[data-tour="inst-courses-table"]',
      title: 'Cursos y docentes',
      body: 'Cada curso con su docente a cargo y sus promedios. Con el lápiz reasignás el docente del curso.',
    },
    {
      target: '[data-tour="inst-manage-courses"]',
      title: 'Gestionar aulas',
      body: 'Creá aulas nuevas, asigná docentes e imprimí los QR fijos que usan los alumnos para entrar.',
    },
    {
      target: '[data-tour="inst-usage"]',
      title: 'Uso del producto',
      body: 'Cuántos docentes usan Habitar cada semana y cuánto se usa la plataforma en general.',
    },
    {
      target: '#app-sidebar a[href="/institucional/alertas"]',
      title: 'Alertas',
      body: 'Cuando un curso queda debajo del umbral en un eje, la alerta aparece acá y también llega por correo.',
    },
    {
      target: '#app-sidebar a[href="/institucional/configuracion"]',
      title: 'Configuración',
      body: 'Niveles, ejes, proveedor de IA, identificación de alumnos, umbral de alertas e idioma por defecto de la institución.',
    },
    {
      target: '[data-tour="header-tools"]',
      title: 'Idioma, tema y recorrido',
      body: 'Cambiá el idioma de la plataforma y el modo claro u oscuro. El idioma que elijas queda guardado en tu cuenta.',
    },
    {
      title: 'Ayuda en cada sección',
      body: 'Cuando veas el símbolo «?», pasá el mouse o tocalo para leer para qué sirve esa parte. ¡Listo!',
    },
  ];
}

function storageKey(tourId: string, userId: string): string {
  return `habitar-tour:${tourId}:${userId}`;
}

function readDone(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'done';
  } catch {
    return false;
  }
}

function markDone(key: string): void {
  try {
    localStorage.setItem(key, 'done');
  } catch {
  }
}

function visibleRect(selector: string | undefined): DOMRect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || rect.right <= 0 || rect.left >= window.innerWidth) return null;
  return rect;
}

export function OnboardingTour({ tourId, steps }: OnboardingTourProps) {
  useI18n();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const key = session ? storageKey(tourId, session.user.id) : null;
  const step = steps[index];

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (key) markDone(key);
  }, [key]);

  useEffect(() => {
    window.__habitarTour = tourId;
    const onStart = () => start();
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => {
      window.removeEventListener(TOUR_START_EVENT, onStart);
      if (window.__habitarTour === tourId) window.__habitarTour = undefined;
    };
  }, [tourId, start]);

  useEffect(() => {
    if (!key) return;
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tour') === '1';
    if (forced) {
      params.delete('tour');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
    if (!forced && readDone(key)) return;
    const timer = window.setTimeout(start, 700);
    return () => window.clearTimeout(timer);
  }, [key, start]);

  const measure = useCallback(() => {
    setRect(visibleRect(step?.target));
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector(step.target) : null;
    if (el && visibleRect(step.target)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    measure();
    const timer = window.setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, close, steps.length]);

  if (!open || !step || typeof document === 'undefined') return null;

  const isLast = index === steps.length - 1;
  const pad = 6;
  const cardWidth = Math.min(340, window.innerWidth - 24);
  let cardStyle: React.CSSProperties = { width: cardWidth, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const cardHeight = 210;
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - cardWidth - 12);
    const top = Math.min(Math.max(rect.top, 12), window.innerHeight - cardHeight - 12);
    if (rect.bottom + pad + 10 + cardHeight < window.innerHeight) {
      cardStyle = { width: cardWidth, left, top: rect.bottom + pad + 10 };
    } else if (rect.top - pad - 10 - cardHeight > 0) {
      cardStyle = { width: cardWidth, left, bottom: window.innerHeight - rect.top + pad + 10 };
    } else if (rect.right + pad + 16 + cardWidth < window.innerWidth) {
      cardStyle = { width: cardWidth, left: rect.right + pad + 16, top };
    } else if (rect.left - pad - 16 - cardWidth > 0) {
      cardStyle = { width: cardWidth, left: rect.left - pad - 16 - cardWidth, top };
    } else {
      cardStyle = { width: cardWidth, left: '50%', bottom: 16, transform: 'translateX(-50%)' };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" data-print-hide>
      {rect ? (
        <div
          aria-hidden="true"
          className="fixed rounded-xl pointer-events-none transition-all duration-200 ring-2 ring-emerald-400"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-slate-900/55" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 outline-none"
        style={cardStyle}
      >
        <div className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
          {t('Paso {current} de {total}', { current: index + 1, total: steps.length })}
        </div>
        <h2 id={titleId} className="text-sm font-bold text-text-pri mb-1.5">
          {t(step.title)}
        </h2>
        <p className="text-[12.5px] text-text-sec leading-relaxed">{t(step.body)}</p>
        <div className="flex items-center justify-between gap-2 mt-4">
          <button type="button" onClick={close} className="text-[11.5px] font-semibold text-text-sec hover:text-text-pri cursor-pointer">
            {isLast ? '' : t('Saltar recorrido')}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="text-[11.5px] font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-text-pri hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
              >
                {t('Anterior')}
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? close() : setIndex(index + 1))}
              className="text-[11.5px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-1.5 cursor-pointer"
            >
              {isLast ? t('Terminar') : t('Siguiente')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
