import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { listPublicPlans, DEFAULT_PUBLIC_PLANS } from '../../../services/subscriptionService';
import type { SubscriptionPlan } from '../../../types/subscription';
import { sessionStore, clearSession } from '../../../store/sessionStore';
import { dashboardPathForRole } from '../../../services/authService';

export function LandingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PUBLIC_PLANS);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [activeAxisTab, setActiveAxisTab] = useState<'literal' | 'inferencial' | 'critico'>('inferencial');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [session, setSession] = useState(sessionStore.get());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSession(sessionStore.get());
    listPublicPlans().then((data) => {
      if (data && data.length > 0) {
        setPlans(data);
      }
    });
  }, []);

  function formatPrice(plan: SubscriptionPlan) {
    if (plan.monthlyPriceArs === 0) return 'Gratis';
    if (billingCycle === 'ANNUAL') {
      const price = plan.annualPriceArs || plan.monthlyPriceArs * 10;
      return `$${price.toLocaleString('es-AR')}`;
    }
    return `$${plan.monthlyPriceArs.toLocaleString('es-AR')}`;
  }

  function formatCycleLabel(plan: SubscriptionPlan) {
    if (plan.monthlyPriceArs === 0) return 'durante 60 días';
    if (billingCycle === 'ANNUAL') return '/ año (facturación anual)';
    return '/ mes (facturación mensual)';
  }

  const axisExamples = {
    literal: {
      title: 'Eje Literal — Recuperación explícita de información',
      description: 'Evalúa la capacidad de ubicar hechos, personajes, cronología y datos textuales tal como fueron formulados en la lectura.',
      sampleQuestion: 'Según el texto sobre biodiversidad, ¿cuál es la causa principal de la ruptura en cadena de los ecosistemas?',
      sampleOptions: [
        'A) El aumento estacional de las lluvias en zonas boscosas.',
        'B) La desaparición de una especie que altera las interdependencias ecológicas (Correcta).',
        'C) La rotación de cultivos en áreas agrícolas protegidas.',
        'D) El ciclo migratorio natural de las aves rapaces.',
      ],
      cognitiveBenefit: 'Fortalece la lectura atenta, la extracción de datos concretos y la memoria de trabajo.',
    },
    inferencial: {
      title: 'Eje Inferencial — Lectura entre líneas y deducción contextual',
      description: 'Desafía al estudiante a deducir intenciones, relaciones causales no explícitas y significado de vocabulario por contexto.',
      sampleQuestion: '¿Qué se puede inferir respecto a la relación entre la biodiversidad y la economía descrita por el autor?',
      sampleOptions: [
        'A) La conservación ecológica solo genera gastos innecesarios para el Estado.',
        'B) Los servicios ecosistémicos sustentan indirectamente actividades productivas humanas (Correcta).',
        'C) Solo los países industrializados pueden permitirse cuidar sus recursos naturales.',
        'D) Las economías modernas son totalmente independientes del medio ambiente.',
      ],
      cognitiveBenefit: 'Desarrolla el razonamiento inductivo/deductivo y la integración profunda de ideas.',
    },
    critico: {
      title: 'Eje Crítico — Juicio fundamentado y pensamiento reflexivo',
      description: 'Estimula la argumentación, la identificación de sesgos, la contrastación de perspectivas y la postura ética del alumno.',
      sampleQuestion: 'A partir de la tesis del texto, ¿cuál de los siguientes argumentos fundamenta mejor una política de protección ambiental comunitaria?',
      sampleOptions: [
        'A) Porque la preservación ecológica es una responsabilidad compartida de impacto ético y generacional (Correcta).',
        'B) Porque impone sanciones monetarias a las comunidades vecinas.',
        'C) Porque evita que otras regiones utilicen los recursos hídricos.',
        'D) Porque garantiza que los precios de los productos no sufran variaciones.',
      ],
      cognitiveBenefit: 'Fomenta el pensamiento crítico, la toma de postura reflexiva y la fundamentación de ideas.',
    },
  };

  const faqs = [
    {
      q: '¿Cómo funciona el código QR permanente del aula física?',
      a: 'Cada aula creada en Habitar tiene un código QR único e inmutable (por ejemplo: AULA-6A-8A4F). El colegio lo imprime una sola vez y lo coloca en la puerta o pared del salón. La docente abre la app desde su celular o laptop, escanea el QR en segundos y el sistema la conecta automáticamente a ese espacio para cargar lecturas y vincular actividades.',
    },
    {
      q: '¿Qué sucede si no hay buena conexión a internet en la escuela?',
      a: 'Habitar está diseñada como Progressive Web App (PWA) con Service Worker integrado. Los textos de lectura y cuestionarios precargados pueden utilizarse sin interrupciones incluso ante cortes temporales de red, sincronizando los resultados una vez recuperada la conexión.',
    },
    {
      q: '¿Cómo genera la IA las preguntas en los tres ejes cognitivos?',
      a: 'El docente puede pegar un texto, subir un archivo (.txt / .md) o importar desde Google Drive. Nuestro motor de IA pedagógica analiza la estructura del texto y formula preguntas calibradas para los tres ejes: Literal, Inferencial y Crítico. El docente tiene control total: puede editar, agregar o ajustar cualquier pregunta antes de publicarla.',
    },
    {
      q: '¿Cómo protege Habitar los datos de los estudiantes (Normativa ARCO)?',
      a: 'La privacidad es nuestro pilar fundamental. Cumplimos con la Ley de Protección de Datos Personales, contamos con módulo de consentimiento informado para tutores legales y herramientas nativas para el ejercicio de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), con trazabilidad y cifrado.',
    },
    {
      q: '¿Cuánto dura el Piloto Gratuito y qué incluye?',
      a: 'El Piloto Gratuito tiene una vigencia de 60 días completos para tu institución. Incluye hasta 15 docentes, 150 alumnos, 8 aulas físicas con QR permanente, alertas tempranas y exportación de reportes, sin costo ni compromiso.',
    },
    {
      q: '¿Se pueden personalizar los cupos y módulos para nuestra institución?',
      a: '¡Sí! Desde el panel de administración de Habitar podemos adaptar planes a medida para colegios de gran tamaño, federaciones o distritos escolares, ajustando cupos de alumnos, almacenamiento, dominio propio de marca blanca e integración con sistemas de gestión escolar.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-text-pri selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      {/* 1. TOP NAVBAR (CLEAN, SHARP SVG LOGO, RESPONSIVE) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-border/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo with official Habitar SVG */}
          <a href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-text-pri leading-none">
                Habi<span className="text-emerald-700">tar</span>
              </span>
              <span className="text-[9.5px] sm:text-[10px] text-text-sec uppercase tracking-widest font-semibold mt-0.5">
                Comprensión Lectora & IA
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs xl:text-[13px] font-medium text-text-sec">
            <a href="#ejes" className="hover:text-emerald-700 transition-colors whitespace-nowrap">3 Ejes</a>
            <a href="#aulas-qr" className="hover:text-emerald-700 transition-colors whitespace-nowrap">Aulas QR</a>
            <a href="#analitica" className="hover:text-emerald-700 transition-colors whitespace-nowrap">Analítica</a>
            <a href="#precios" className="hover:text-emerald-700 transition-colors whitespace-nowrap">Planes</a>
            <a href="#privacidad" className="hover:text-emerald-700 transition-colors whitespace-nowrap font-semibold text-emerald-800">Privacidad & PBA</a>
            <a href="#faq" className="hover:text-emerald-700 transition-colors whitespace-nowrap">FAQ</a>
          </nav>

          {/* Header Action Buttons (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <ThemeToggle variant="compact" />
            {session ? (
              <div className="flex items-center gap-2.5">
                {/* User Info Capsule */}
                <div className="flex items-center gap-2 bg-surface border border-gray-border/80 rounded-full pl-1.5 pr-3 py-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-text-pri leading-tight truncate max-w-[140px]">
                      {session.user.name}
                    </span>
                    <span className="text-[9.5px] font-semibold text-emerald-800 leading-none">
                      {session.impersonatedRole
                        ? `Admin (${session.impersonatedRole})`
                        : session.user.role === 'admin'
                        ? 'Admin'
                        : session.user.role === 'docente'
                        ? 'Docente'
                        : session.user.role === 'director'
                        ? 'Director/a'
                        : 'Coordinador/a'}
                    </span>
                  </div>
                </div>

                {/* Direct Panel Link */}
                <a
                  href={dashboardPathForRole(session.user.role)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                >
                  <span>Ir a mi Panel</span>
                  <Icon name="arrowRight" size={12} />
                </a>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    clearSession();
                    setSession(null);
                  }}
                  className="text-text-sec hover:text-red p-1.5 rounded-md hover:bg-red-50 text-xs transition-colors"
                  title="Cerrar sesión"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                    window.location.href = '/actividad';
                  }}
                  className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  <span>🎒</span>
                  <span>Soy Alumno</span>
                </button>
                <a
                  href="/login"
                  className="text-xs font-semibold text-text-pri hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-surface transition-colors whitespace-nowrap"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Piloto Gratis</span>
                  <Icon name="arrowRight" size={12} />
                </a>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-text-sec hover:text-text-pri hover:bg-surface border border-gray-border/70 transition-colors shrink-0"
            aria-label="Menú de navegación"
          >
            <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={18} />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-border px-4 pt-3 pb-5 space-y-3 shadow-lg">
            {/* Logged in User Card on Mobile */}
            {session && (
              <div className="bg-surface border border-gray-border rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-pri">{session.user.name}</span>
                    <span className="text-[10px] font-semibold text-emerald-800">
                      {session.impersonatedRole
                        ? `Admin (${session.impersonatedRole})`
                        : session.user.role === 'admin'
                        ? 'Admin'
                        : session.user.role === 'docente'
                        ? 'Docente'
                        : session.user.role === 'director'
                        ? 'Director/a'
                        : 'Coordinador/a'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-gray-border/60">
                  <a
                    href={dashboardPathForRole(session.user.role)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm"
                  >
                    <span>Ir a mi Panel</span>
                    <Icon name="arrowRight" size={12} />
                  </a>
                  <button
                    onClick={() => {
                      clearSession();
                      setSession(null);
                    }}
                    className="px-3 py-2 border border-gray-border rounded-lg text-xs font-medium text-text-sec hover:text-red hover:bg-red-50 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-1.5 text-sm font-medium text-text-pri">
              <a
                href="#ejes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                3 Ejes Cognitivos
              </a>
              <a
                href="#aulas-qr"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                Aulas & QR Fijo
              </a>
              <a
                href="#analitica"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                Analítica Directiva
              </a>
              <a
                href="#precios"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                Planes & Precios
              </a>
              <a
                href="#privacidad"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors font-semibold text-emerald-800"
              >
                Privacidad & Normativa PBA
              </a>
              <a
                href="#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                Preguntas Frecuentes
              </a>
            </nav>

            <div className="pt-3 pb-1 border-t border-gray-border flex items-center justify-between">
              <span className="text-xs text-text-sec font-medium">Apariencia:</span>
              <ThemeToggle variant="segmented" />
            </div>

            {!session && (
              <div className="pt-3 border-t border-gray-border flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                    setIsMobileMenuOpen(false);
                    window.location.href = '/actividad';
                  }}
                  className="w-full text-center py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🎒</span>
                  <span>Soy Alumno / Entrar a clase</span>
                </button>
                <a
                  href="/login"
                  className="w-full text-center py-2.5 text-xs font-semibold text-text-pri border border-gray-border rounded-lg hover:bg-surface transition-colors"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-emerald-800 transition-colors"
                >
                  Comenzar Piloto Gratuito (60 días)
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Hero Left Column */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-300/80 rounded-full px-3.5 py-1 text-[11px] sm:text-[11.5px] font-semibold text-emerald-900 shadow-sm max-w-full">
                <Icon name="sparkles" size={13} className="text-emerald-700 shrink-0" />
                <span className="truncate">Validado por Expertos Pedagógicos & Modelo Financiero Sostenible</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[50px] font-extrabold text-text-pri tracking-tight leading-[1.15]">
                Potenciá la <span className="text-emerald-700 underline decoration-emerald-300 underline-offset-8">comprensión lectora</span> con IA en tu institución.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-text-sec leading-relaxed max-w-2xl mx-auto lg:mx-0">
                La plataforma integral para escuelas primarias y secundarias: evalúa los tres ejes cognitivos (<strong>Literal</strong>, <strong>Inferencial</strong> y <strong>Crítico</strong>), conecta aulas físicas con <strong>códigos QR permanentes</strong> y genera <strong>analítica en tiempo real</strong> para directivos y docentes.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#precios"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Icon name="zap" size={15} />
                  <span>Comenzar Piloto Gratuito (60 días)</span>
                </a>
                <a
                  href="#aulas-qr"
                  className="bg-white border border-gray-border hover:border-emerald-400 hover:bg-emerald-50/50 text-text-pri px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Icon name="qrCode" size={15} className="text-emerald-700" />
                  <span>Aulas con QR Permanente</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-5 border-t border-gray-border/60 grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 text-center sm:text-left">
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-800">3 Ejes</div>
                  <div className="text-[10.5px] sm:text-[11px] text-text-sec font-medium leading-tight mt-0.5">Literal, Inferencial y Crítico</div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-800">100% QR</div>
                  <div className="text-[10.5px] sm:text-[11px] text-text-sec font-medium leading-tight mt-0.5">Fijo en aulas sin proyector</div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-800">ARCO</div>
                  <div className="text-[10.5px] sm:text-[11px] text-text-sec font-medium leading-tight mt-0.5">Privacidad por diseño en menores</div>
                </div>
              </div>
            </div>

            {/* Hero Right Column: Live Mockup Card */}
            <div className="lg:col-span-5 relative w-full">
              <div className="relative mx-auto max-w-md bg-white border border-gray-border rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5">
                {/* Classroom Status Ribbon */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                      <Icon name="school" size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-pri">6° A — Salón 12</div>
                      <div className="text-[10px] text-text-sec font-mono font-medium">QR Permanente: AULA-6A-8A4F</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Aula Conectada
                  </span>
                </div>

                {/* Source Reading Snippet */}
                <div className="bg-surface rounded-xl p-3 border border-gray-border/70 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-text-sec">
                    <span className="flex items-center gap-1 font-semibold text-text-pri truncate pr-2">
                      <Icon name="fileText" size={13} className="text-emerald-700 shrink-0" />
                      Lectura: Biodiversidad
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold shrink-0">248 palabras</span>
                  </div>
                  <p className="text-[11.5px] text-text-sec leading-relaxed italic line-clamp-3">
                    "La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para sobrevivir..."
                  </p>
                </div>

                {/* Questions Preview per Axis */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider">
                    Preguntas generadas por IA y calibradas
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                      <span className="font-medium truncate pr-2">1. Causa de ruptura ecosistémica</span>
                      <span className="text-[10px] uppercase font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded shrink-0">
                        Literal
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950">
                      <span className="font-medium truncate pr-2">2. Inferencia economía y conservación</span>
                      <span className="text-[10px] uppercase font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                        Inferencial
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/70 border border-red-200 text-red-950">
                      <span className="font-medium truncate pr-2">3. Argumentación sobre ética ambiental</span>
                      <span className="text-[10px] uppercase font-bold bg-red-200/80 text-red-900 px-1.5 py-0.5 rounded shrink-0">
                        Crítico
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-Time Live Results Meter */}
                <div className="pt-2 border-t border-gray-border flex items-center justify-between text-[11px]">
                  <span className="text-text-sec">Progreso: <strong>26/28 alumnos</strong></span>
                  <span className="text-emerald-700 font-bold">89% Comprensión Global</span>
                </div>
              </div>

              {/* Decorative Blur Background */}
              <div className="absolute -z-10 -bottom-6 -right-6 w-44 h-44 bg-emerald-200/50 rounded-full blur-2xl" />
            </div>

          </div>
        </div>
      </section>

      {/* 3. COGNITIVE AXES INTERACTIVE SHOWCASE */}
      <section id="ejes" className="py-16 sm:py-20 bg-surface border-y border-gray-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="layers" size={13} />
              Marco Pedagógico Validado
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight">
              Los Tres Ejes de la Comprensión Lectora
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-text-sec leading-relaxed max-w-xl mx-auto">
              Superamos la simple memorización. Habitar estructura cada evaluación en tres dimensiones cognitivas complementarias para diagnosticar con precisión el nivel de cada alumno.
            </p>
          </div>

          {/* Interactive Axis Tabs */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 bg-white border border-gray-border rounded-xl mb-5 shadow-sm">
              <button
                onClick={() => setActiveAxisTab('literal')}
                className={`py-2.5 sm:py-3 px-1 sm:px-4 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeAxisTab === 'literal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri hover:bg-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
                <span>Literal</span>
              </button>
              <button
                onClick={() => setActiveAxisTab('inferencial')}
                className={`py-2.5 sm:py-3 px-1 sm:px-4 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeAxisTab === 'inferencial'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri hover:bg-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0" />
                <span>Inferencial</span>
              </button>
              <button
                onClick={() => setActiveAxisTab('critico')}
                className={`py-2.5 sm:py-3 px-1 sm:px-4 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeAxisTab === 'critico'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri hover:bg-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-300 shrink-0" />
                <span>Crítico</span>
              </button>
            </div>

            {/* Tab Detail Card */}
            <div className="bg-white border border-gray-border rounded-2xl p-5 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-5 border-b border-gray-border">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-text-pri">
                    {axisExamples[activeAxisTab].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-sec mt-1 leading-relaxed">
                    {axisExamples[activeAxisTab].description}
                  </p>
                </div>
                <div className="shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-md self-start md:self-auto">
                  {axisExamples[activeAxisTab].cognitiveBenefit}
                </div>
              </div>

              {/* Sample Question Box */}
              <div className="mt-5 bg-surface border border-gray-border rounded-xl p-4 sm:p-5 space-y-3">
                <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider">
                  Ejemplo de ítem pedagógico generado:
                </div>
                <div className="text-xs sm:text-sm font-semibold text-text-pri leading-snug">
                  {axisExamples[activeAxisTab].sampleQuestion}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                  {axisExamples[activeAxisTab].sampleOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg text-xs border ${
                        opt.includes('(Correcta)')
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-gray-border text-text-sec'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AULAS CON QR FIJO PERMANENTE */}
      <section id="aulas-qr" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                <Icon name="qrCode" size={14} />
                Innovación en el Espacio Físico
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight leading-tight">
                Aulas físicas con Códigos QR fijos y permanentes.
              </h2>

              <p className="text-sm sm:text-base text-text-sec leading-relaxed">
                Olvidate de proyectar enlaces largos o generar códigos nuevos cada semana. En Habitar, cada salón de clases cuenta con un <strong>código QR permanente e inmutable</strong> que se imprime una sola vez y se pega en la pared del aula.
              </p>

              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-pri">Creación del aula física</h4>
                    <p className="text-xs text-text-sec mt-0.5">Definí materia, salón físico, grado, división y turno horario.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-pri">Cartel QR Imprimible en un clic</h4>
                    <p className="text-xs text-text-sec mt-0.5">Generá el póster en formato A4 listo para imprimir y colocar en el aula física.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-pri">Escáner integrado en la app docente</h4>
                    <p className="text-xs text-text-sec mt-0.5">La docente llega al salón, escanea el QR desde su celular y sube el archivo de lectura para ese grupo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Representation of Classroom Poster */}
            <div className="lg:col-span-6 flex justify-center w-full">
              <div className="w-full max-w-sm bg-white border-2 border-dashed border-emerald-400/80 rounded-2xl p-6 sm:p-7 shadow-lg text-center space-y-4">
                <div className="inline-block bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Cartel Fijo Oficial de Aula
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-text-pri">AULA 6° A — Salón 12</div>
                  <div className="text-xs text-text-sec font-medium">Turno Mañana · Escuela San Martín</div>
                </div>

                {/* QR Code Vector Representation */}
                <div className="w-40 h-40 sm:w-44 sm:h-44 mx-auto bg-white p-3 rounded-xl border border-gray-border shadow-inner flex flex-col items-center justify-center">
                  <div className="text-emerald-800">
                    <Icon name="qrCode" size={100} />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-950 mt-1">AULA-6A-8A4F</span>
                </div>

                <div className="text-[11px] text-text-sec">
                  Escanear con la app docente de Habitar para cargar lectura y preguntas
                </div>

                <div className="pt-2 border-t border-gray-border flex justify-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <Icon name="printer" size={12} />
                    Listo para imprimir en A4
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. ANALÍTICA DIRECTIVA & SEGUIMIENTO PEDAGÓGICO */}
      <section id="analitica" className="py-16 sm:py-20 bg-surface border-t border-gray-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="chart" size={13} />
              Para Directores y Equipos de Conducción
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight">
              Visión Integral del Rendimiento Escolar
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-text-sec leading-relaxed max-w-xl mx-auto">
              Detectá a tiempo a los estudiantes que necesitan apoyo, compará evoluciones entre trimestres y tomá decisiones pedagógicas respaldadas por evidencia real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="bg-white border border-gray-border rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                <Icon name="alertTriangle" size={18} />
              </div>
              <h3 className="text-base font-bold text-text-pri">Alertas Tempranas de Riesgo</h3>
              <p className="text-xs text-text-sec leading-relaxed">
                Algoritmos que detectan caídas en comprensión inferencial o crítica antes de las instancias de cierre, permitiendo intervenciones oportunas.
              </p>
            </div>

            <div className="bg-white border border-gray-border rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <Icon name="activity" size={18} />
              </div>
              <h3 className="text-base font-bold text-text-pri">Comparador de Períodos</h3>
              <p className="text-xs text-text-sec leading-relaxed">
                Contrastá el rendimiento de un aula entre Período A y Período B con deltas porcentuales en cada uno de los tres ejes cognitivos.
              </p>
            </div>

            <div className="bg-white border border-gray-border rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                <Icon name="download" size={18} />
              </div>
              <h3 className="text-base font-bold text-text-pri">Exportación Institucional</h3>
              <p className="text-xs text-text-sec leading-relaxed">
                Descargá reportes completos en formato Excel o PDF con un solo clic para presentar ante inspectores, supervisores o directivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DYNAMIC PRICING PLANS SECTION (LINKED DIRECTLY TO DB) */}
      <section id="precios" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="zap" size={13} />
              Inversión Transparente para tu Escuela
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight">
              Planes de Suscripción Institucional
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-text-sec leading-relaxed">
              Comenzá hoy con un piloto gratuito sin costo o elegí el plan que mejor se adapte al tamaño de tu institución educativa.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="mt-6 sm:mt-8 inline-flex items-center p-1.5 bg-surface border border-gray-border rounded-xl">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white text-text-pri shadow-sm border border-gray-border'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-text-sec hover:text-text-pri'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="bg-emerald-200 text-emerald-900 text-[9.5px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                  2 meses gratis (17% OFF)
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {plans.map((plan) => {
              const isPopular = plan.id === 'estandar';
              const isPremium = plan.id === 'premium';
              const isPilot = plan.id === 'piloto';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 transition-all ${
                    isPremium
                      ? 'bg-gradient-to-b from-emerald-950 to-emerald-900 text-white shadow-xl ring-2 ring-emerald-500'
                      : isPopular
                      ? 'bg-white border-2 border-emerald-600 shadow-lg'
                      : 'bg-white border border-gray-border shadow-sm'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm whitespace-nowrap ${
                          isPremium
                            ? 'bg-emerald-400 text-emerald-950'
                            : isPopular
                            ? 'bg-emerald-600 text-white'
                            : 'bg-surface text-text-sec border border-gray-border'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Plan Header */}
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold ${isPremium ? 'text-white' : 'text-text-pri'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${isPremium ? 'text-emerald-100' : 'text-text-sec'}`}>
                        {plan.description}
                      </p>
                    </div>

                    {/* Price Display */}
                    <div className="py-4 border-y border-gray-border/40 my-4">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl sm:text-4xl font-black ${isPremium ? 'text-white' : 'text-text-pri'}`}>
                          {formatPrice(plan)}
                        </span>
                        <span className={`text-xs ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>
                          {formatCycleLabel(plan)}
                        </span>
                      </div>
                      {billingCycle === 'ANNUAL' && plan.monthlyPriceArs > 0 && (
                        <div className={`text-[11px] mt-1 font-medium ${isPremium ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          Equivale a ${Math.round((plan.annualPriceArs || plan.monthlyPriceArs * 10) / 12).toLocaleString('es-AR')}/mes
                        </div>
                      )}
                    </div>

                    {/* Quotas Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                      <div className={`p-2 rounded-lg ${isPremium ? 'bg-emerald-800/60' : 'bg-surface'}`}>
                        <div className={`text-[10px] uppercase font-semibold ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>Alumnos</div>
                        <div className="font-bold">{plan.maxStudents.toLocaleString('es-AR')}</div>
                      </div>
                      <div className={`p-2 rounded-lg ${isPremium ? 'bg-emerald-800/60' : 'bg-surface'}`}>
                        <div className={`text-[10px] uppercase font-semibold ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>Aulas QR</div>
                        <div className="font-bold">{plan.maxCourses}</div>
                      </div>
                      <div className={`p-2 rounded-lg ${isPremium ? 'bg-emerald-800/60' : 'bg-surface'}`}>
                        <div className={`text-[10px] uppercase font-semibold ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>Docentes</div>
                        <div className="font-bold">{plan.maxUsers}</div>
                      </div>
                      <div className={`p-2 rounded-lg ${isPremium ? 'bg-emerald-800/60' : 'bg-surface'}`}>
                        <div className={`text-[10px] uppercase font-semibold ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>Almacenamiento</div>
                        <div className="font-bold">{plan.storageGb} GB</div>
                      </div>
                    </div>

                    {/* Features Bullet List */}
                    <div className="space-y-2.5 text-xs">
                      <div className={`font-semibold uppercase tracking-wider text-[10.5px] ${isPremium ? 'text-emerald-200' : 'text-text-sec'}`}>
                        Lo que incluye:
                      </div>
                      {(plan.features?.bullets || []).map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className={`shrink-0 mt-0.5 ${isPremium ? 'text-emerald-300' : 'text-emerald-600'}`}>
                            <Icon name="check" size={14} />
                          </span>
                          <span className={`leading-tight ${isPremium ? 'text-emerald-50' : 'text-text-pri'}`}>
                            {bullet}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="mt-8 pt-4 border-t border-gray-border/40">
                    <a
                      href={isPilot ? '/login' : '/login'}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                        isPremium
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold'
                          : isPopular
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-surface hover:bg-gray-100 border border-gray-border text-text-pri'
                      }`}
                    >
                      <span>{isPilot ? 'Iniciar Piloto Gratuito' : `Elegir ${plan.name}`}</span>
                      <Icon name="arrowRight" size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Plans Banner for Districts / Educational Networks */}
          <div className="mt-10 sm:mt-12 bg-surface border border-gray-border rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm sm:text-base font-bold text-text-pri">
                ¿Gestionás una red escolar, congregación o distrito educativo?
              </h4>
              <p className="text-xs text-text-sec max-w-2xl">
                Configuramos planes personalizados con cupos a medida, facturación especial por orden de compra, soporte técnico presencial y capacitaciones docentes.
              </p>
            </div>
            <a
              href="mailto:contacto@habitar.lat?subject=Consulta%20Plan%20Institucional%20Habitar"
              className="bg-white border border-gray-border hover:border-emerald-600 px-5 py-2.5 rounded-xl text-xs font-semibold text-text-pri hover:text-emerald-700 transition-all shrink-0 shadow-sm"
            >
              Contactar con un Asesor
            </a>
          </div>
        </div>
      </section>

      {/* 7. PRIVACIDAD, GOBERNANZA DE DATOS & NORMATIVA PBA (DGCyE) */}
      <section id="privacidad" className="py-16 sm:py-20 bg-white border-t border-gray-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full mb-3 shadow-xs">
              <Icon name="shield" size={13} />
              Seguridad Institucional & Soberanía de Datos
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight">
              Cumplimiento Normativo DGCyE PBA y Privacidad Escolar
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-text-sec leading-relaxed">
              Habitar fue diseñado desde sus cimientos arquitectónicos para adaptarse a las exigencias jurídicas y pedagógicas de la <strong>Provincia de Buenos Aires</strong> (DGCyE / DIPREGEP), resguardando los derechos fundamentales de niñas, niños y adolescentes.
            </p>
          </div>

          {/* 4 Compliance Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface border border-gray-border/80 rounded-2xl p-5 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Icon name="school" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-text-pri">
                  Marco DGCyE & DIPREGEP
                </h3>
                <p className="text-xs text-text-sec leading-relaxed">
                  Alineado a la <strong>Ley Provincial N° 13.688</strong> (Art. 16) y la <strong>Ley Nacional N° 26.061</strong>. Garantizamos el interés superior de la niñez, la preservación de la intimidad y la prohibición absoluta de explotación comercial o perfilamiento publicitario.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-border/50 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Jurisdicción PBA</span>
              </div>
            </div>

            <div className="bg-surface border border-gray-border/80 rounded-2xl p-5 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Icon name="lock" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-text-pri">
                  Gobernanza B2B Escolar
                </h3>
                <p className="text-xs text-text-sec leading-relaxed">
                  Bajo la <strong>Ley 25.326</strong>, la Escuela es la exclusiva <em>Responsable del Tratamiento</em> de su matrícula. Habitar actúa estrictamente como <em>Encargado del Tratamiento</em>: no vendemos, no cedemos ni monetizamos ninguna información del alumnado.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-border/50 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Contrato B2B con Escuelas</span>
              </div>
            </div>

            <div className="bg-surface border border-gray-border/80 rounded-2xl p-5 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Icon name="sparkles" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-text-pri">
                  IA Ética sin Re-entrenamiento
                </h3>
                <p className="text-xs text-text-sec leading-relaxed">
                  Las producciones y respuestas de los alumnos <strong>nunca son utilizadas para entrenar modelos de IA</strong> públicos ni comerciales. La evaluación es asistiva; la toma de decisiones pedagógicas y calificaciones permanece siempre en el criterio docente humano.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-border/50 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Supervisión Humana Obligatoria</span>
              </div>
            </div>

            <div className="bg-surface border border-gray-border/80 rounded-2xl p-5 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Icon name="shield" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-text-pri">
                  Derechos ARCO & Cifrado
                </h3>
                <p className="text-xs text-text-sec leading-relaxed">
                  Cifrado de extremo a extremo en tránsito (TLS 1.3) y en reposo (AES-256). Ejercicio garantizado de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) ante solicitud formal de directivos o familias tutoras.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-border/50 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Auditoría & Supresión Permanente</span>
              </div>
            </div>
          </div>

          {/* Legal Document Highlight Banner */}
          <div className="mt-10 sm:mt-12 bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                Documento Institucional Oficial
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Política Integral de Privacidad y Tratamiento de Datos Escolares
              </h4>
              <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                Consultá los 10 puntos de nuestro pliego legal completo: bases normativas PBA, roles contractuales, protocolos ante incidentes de ciberseguridad y vías de contacto del Oficial de Protección de Datos (DPO).
              </p>
            </div>
            <a
              href="/privacidad"
              className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-5 py-3 rounded-xl text-xs transition-all shrink-0 shadow flex items-center gap-2"
            >
              <span>Leer Política Completa PBA</span>
              <Icon name="arrowRight" size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-16 sm:py-20 bg-surface border-t border-gray-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="helpCircle" size={13} />
              Resolución de Dudas
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-pri tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-text-sec">
              Todo lo que directores, docentes y coordinadores pedagógicos necesitan saber.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-border rounded-xl overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-text-pri hover:text-emerald-800 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className={`transition-transform duration-200 text-text-sec shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs sm:text-[13px] text-text-sec leading-relaxed border-t border-gray-border/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA BANNER */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 sm:space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-700/80 border border-emerald-500/50 rounded-full px-4 py-1 text-xs font-semibold text-emerald-100">
            <Icon name="sparkles" size={14} />
            <span>Transformación Pedagógica Real</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Sumá tu escuela a la nueva era de la comprensión lectora.
          </h2>

          <p className="text-xs sm:text-base text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Iniciá hoy tu prueba piloto gratuita de 60 días sin compromiso y descubrí cómo el diagnóstico en tres ejes transforma los resultados de tus estudiantes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <a
              href="#precios"
              className="w-full sm:w-auto bg-white text-emerald-950 hover:bg-emerald-50 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Ver Planes & Comenzar Piloto</span>
              <Icon name="arrowRight" size={14} />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto bg-emerald-800/80 hover:bg-emerald-700/80 text-white border border-emerald-500/50 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <span>Ingresar a la Plataforma</span>
            </a>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-white border-t border-gray-border py-12 text-xs text-text-sec">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="Logo" className="w-6 h-6 object-contain" />
                <span className="text-base font-bold text-text-pri">
                  Habi<span className="text-emerald-700">tar</span>
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed">
                Plataforma de evaluación y potenciación de la comprensión lectora mediante Inteligencia Artificial y aulas físicas QR.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-text-pri mb-2.5 uppercase tracking-wider text-[10px]">Plataforma</h5>
              <ul className="space-y-1.5">
                <li><a href="/login" className="hover:text-emerald-700">Acceso Docentes</a></li>
                <li><a href="/login" className="hover:text-emerald-700">Portal Directivo</a></li>
                <li><a href="#aulas-qr" className="hover:text-emerald-700">Aulas QR Permanente</a></li>
                <li><a href="#precios" className="hover:text-emerald-700">Planes de Suscripción</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-text-pri mb-2.5 uppercase tracking-wider text-[10px]">Normativa & Legal</h5>
              <ul className="space-y-1.5">
                <li><a href="/privacidad" className="hover:text-emerald-700 font-semibold text-emerald-850">Política de Privacidad PBA (DGCyE)</a></li>
                <li><a href="/consentimiento" className="hover:text-emerald-700">Consentimiento Menores (Ley 26.061)</a></li>
                <li><a href="/brand" className="hover:text-emerald-700 font-medium text-emerald-800">Kit de Marca & Logos Oficiales</a></li>
                <li><a href="/privacidad#derechos-arco" className="hover:text-emerald-700">Gobernanza y Derechos ARCO</a></li>
                <li><a href="/status" className="hover:text-emerald-700">Estado del Sistema & SLA</a></li>
                <li><a href="/admin/api" className="hover:text-emerald-700">API para Desarrolladores</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-text-pri mb-2.5 uppercase tracking-wider text-[10px]">Contacto Institucional</h5>
              <p className="text-[11.5px] leading-relaxed">
                Soporte y mesas de ayuda pedagógica para instituciones educativas de Argentina y Latinoamérica.
              </p>
              <div className="mt-2 text-emerald-800 font-semibold">
                contacto@habitar.lat
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>
              © {new Date().getFullYear()} Habitar — Todos los derechos reservados. Proyecto de Tesis de Grado.
            </div>
            <div className="flex gap-4">
              <a href="/brand" className="hover:text-emerald-700 font-medium">Kit de Marca</a>
              <a href="/privacidad" className="hover:text-emerald-700 font-semibold text-emerald-800">Privacidad PBA</a>
              <a href="/consentimiento" className="hover:text-emerald-700">Consentimiento</a>
              <a href="/status" className="hover:text-emerald-700">Monitoreo SLA</a>
              <a href="/login" className="hover:text-emerald-700">Ingreso Seguro</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
