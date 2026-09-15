import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
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
    try {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } catch {}

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
      badge: 'Eje 1 · Nivel Explícito',
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
      badge: 'Eje 2 · Nivel Comprensivo',
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
      badge: 'Eje 3 · Nivel Reflexivo',
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
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 selection:bg-emerald-100 selection:text-emerald-950 font-sans antialiased">
      {/* Top Banner Notice */}
      <div className="bg-[#0A4D3C] text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium border-b border-emerald-900/50 flex items-center justify-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
          NUEVO
        </span>
        <span>Aulas Físicas con QR Permanente y Diagnósticos Calibrados DGCyE PBA</span>
        <a href="#aulas-qr" className="underline font-semibold hover:text-emerald-200 transition-colors ml-1">
          Ver funcionamiento →
        </a>
      </div>

      {/* Main Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6E56] to-[#0A4D3C] text-white flex items-center justify-center p-1.5 shadow-xs group-hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain filter invert brightness-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                Habi<span className="text-emerald-700">tar</span>
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold mt-0.5">
                Comprensión Lectora Escolar
              </span>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-[13px] font-semibold text-slate-600">
            <a href="#ejes" className="hover:text-emerald-700 transition-colors">3 Ejes Cognitivos</a>
            <a href="#aulas-qr" className="hover:text-emerald-700 transition-colors">Aulas QR</a>
            <a href="#analitica" className="hover:text-emerald-700 transition-colors">Analítica Directiva</a>
            <a href="#precios" className="hover:text-emerald-700 transition-colors">Planes & Precios</a>
            <a href="#privacidad" className="hover:text-emerald-700 transition-colors text-emerald-800 font-bold flex items-center gap-1">
              <Icon name="shield" size={13} />
              <span>Privacidad PBA</span>
            </a>
            <a href="#faq" className="hover:text-emerald-700 transition-colors">Preguntas Frecuentes</a>
          </nav>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {session ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-full pl-1.5 pr-3.5 py-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
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

                <a
                  href={dashboardPathForRole(session.user.role)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap"
                >
                  <span>Ir a mi Panel</span>
                  <Icon name="arrowRight" size={12} />
                </a>

                <button
                  onClick={() => {
                    clearSession();
                    setSession(null);
                  }}
                  className="text-stone-500 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 text-xs transition-colors"
                  title="Cerrar sesión"
                >
                  <Icon name="close" size={14} />
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
                  className="text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 px-3.5 py-2 rounded-xl border border-emerald-300/80 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <span className="text-sm">🎒</span>
                  <span>Soy Alumno</span>
                </button>
                <a
                  href="/login"
                  className="text-xs font-bold text-slate-700 hover:text-emerald-800 px-3.5 py-2 rounded-xl hover:bg-stone-100 transition-colors whitespace-nowrap"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Piloto Gratis</span>
                  <Icon name="arrowRight" size={12} />
                </a>
              </>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl text-stone-600 hover:text-slate-900 hover:bg-stone-100 border border-stone-200 transition-colors shrink-0"
            aria-label="Menú de navegación"
          >
            <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={18} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-stone-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            {session && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{session.user.name}</span>
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
                <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                  <a
                    href={dashboardPathForRole(session.user.role)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold shadow-xs"
                  >
                    <span>Ir a mi Panel</span>
                    <Icon name="arrowRight" size={12} />
                  </a>
                  <button
                    onClick={() => {
                      clearSession();
                      setSession(null);
                    }}
                    className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-800">
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
                Aulas & QR Permanente
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
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition-colors font-bold text-emerald-800"
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

            {!session && (
              <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                    setIsMobileMenuOpen(false);
                    window.location.href = '/actividad';
                  }}
                  className="w-full text-center py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🎒</span>
                  <span>Soy Alumno / Entrar a clase</span>
                </button>
                <a
                  href="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-slate-800 border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-800 transition-colors"
                >
                  Comenzar Piloto Gratuito (60 días)
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-stone-200/80 bg-white overflow-hidden">
        {/* Subtle decorative mesh background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 bg-stone-100/90 border border-stone-200/90 rounded-full px-4 py-1.5 text-xs font-bold text-stone-800 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Pedagogía Institucional & Normativa DGCyE PBA</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12]">
                Fortalecé la <span className="text-emerald-750 underline decoration-emerald-400 decoration-wavy decoration-2">comprensión lectora</span> en cada aula de tu escuela.
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                La plataforma diseñada para escuelas primarias y secundarias: diagnósticos en <strong>tres ejes cognitivos</strong> (Literal, Inferencial y Crítico), conexión física con <strong>códigos QR permanentes</strong> y <strong>analítica formativa en tiempo real</strong> para docentes y directivos.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href="#precios"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Icon name="zap" size={16} className="text-emerald-300 group-hover:scale-110 transition-transform" />
                  <span>Comenzar Piloto Gratuito (60 días)</span>
                </a>
                <a
                  href="#aulas-qr"
                  className="bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-emerald-600 text-slate-800 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Icon name="qrCode" size={16} className="text-emerald-700" />
                  <span>Conocer Aulas QR</span>
                </a>
              </div>

              <div className="pt-8 border-t border-stone-200 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center sm:text-left">
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/60">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">3 Ejes</div>
                  <div className="text-[11px] text-stone-500 font-semibold leading-tight mt-0.5">Literal, Inferencial y Crítico</div>
                </div>
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/60">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">100% QR</div>
                  <div className="text-[11px] text-stone-500 font-semibold leading-tight mt-0.5">Fijo en pared sin proyector</div>
                </div>
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/60">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">ARCO / PBA</div>
                  <div className="text-[11px] text-stone-500 font-semibold leading-tight mt-0.5">Privacidad y Ley 25.326</div>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Preview Card */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 relative">
                {/* Floating pill badge */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-850 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      <Icon name="school" size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">6° A — Salón 12</div>
                      <div className="text-[11px] text-stone-500 font-mono font-semibold">QR Fijo: AULA-6A-8A4F</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-3 py-1 rounded-full shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Aula Activa
                  </span>
                </div>

                {/* Simulated Reading Box */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 truncate pr-2">
                      <Icon name="fileText" size={14} className="text-emerald-700 shrink-0" />
                      Lectura: Biodiversidad y Ecosistemas
                    </span>
                    <span className="text-[10.5px] text-stone-500 font-mono font-medium shrink-0">248 palabras</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-stone-200/70">
                    "La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para mantener el equilibrio ecológico..."
                  </p>
                </div>

                {/* 3 Axis questions preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <span>Preguntas Calibradas por Eje</span>
                    <span className="text-emerald-700">IA Asistiva</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-slate-800 hover:bg-emerald-50/50 transition-colors">
                      <span className="font-semibold text-xs truncate pr-2">1. Causa de ruptura ecosistémica</span>
                      <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md shrink-0 border border-emerald-200">
                        Literal
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-slate-800 hover:bg-amber-50/50 transition-colors">
                      <span className="font-semibold text-xs truncate pr-2">2. Inferencia economía y conservación</span>
                      <span className="text-[10px] uppercase font-extrabold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md shrink-0 border border-amber-200">
                        Inferencial
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-slate-800 hover:bg-rose-50/50 transition-colors">
                      <span className="font-semibold text-xs truncate pr-2">3. Argumentación sobre ética ambiental</span>
                      <span className="text-[10px] uppercase font-extrabold bg-rose-100 text-rose-900 px-2.5 py-1 rounded-md shrink-0 border border-rose-200">
                        Crítico
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer stats in preview */}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-medium">Alumnos presentes: <strong className="text-slate-900 font-bold">26/28</strong></span>
                  <span className="text-emerald-750 font-black bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    89% Comprensión Global
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3 Cognitive Axes Section */}
      <section id="ejes" className="py-20 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3.5 py-1 rounded-full mb-3">
              <Icon name="layers" size={14} />
              <span>Marco Pedagógico Validado</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Los Tres Ejes de la Comprensión Lectora
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl mx-auto">
              Superamos la simple memorización. Habitar estructura cada evaluación en tres dimensiones cognitivas complementarias para diagnosticar con precisión el nivel de cada alumno.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Segmented Axis Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-200/80 border border-stone-300/80 rounded-2xl mb-8">
              <button
                onClick={() => setActiveAxisTab('literal')}
                className={`py-3 px-3 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'literal'
                    ? 'bg-white text-emerald-950 shadow-sm border border-stone-200'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span>Literal</span>
              </button>
              <button
                onClick={() => setActiveAxisTab('inferencial')}
                className={`py-3 px-3 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'inferencial'
                    ? 'bg-white text-amber-950 shadow-sm border border-stone-200'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                <span>Inferencial</span>
              </button>
              <button
                onClick={() => setActiveAxisTab('critico')}
                className={`py-3 px-3 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'critico'
                    ? 'bg-white text-rose-950 shadow-sm border border-stone-200'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <span>Crítico</span>
              </button>
            </div>

            {/* Active Axis Card */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-9 shadow-md transition-all">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 pb-6 border-b border-stone-200">
                <div className="space-y-1.5 max-w-xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                    {axisExamples[activeAxisTab].badge}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900">
                    {axisExamples[activeAxisTab].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                    {axisExamples[activeAxisTab].description}
                  </p>
                </div>
                <div className="shrink-0 bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-bold px-4 py-2 rounded-xl self-start md:self-auto shadow-2xs">
                  {axisExamples[activeAxisTab].cognitiveBenefit}
                </div>
              </div>

              <div className="mt-6 bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="fileText" size={13} className="text-emerald-700" />
                  <span>Ejemplo de ítem pedagógico generado:</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {axisExamples[activeAxisTab].sampleQuestion}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {axisExamples[activeAxisTab].sampleOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl text-xs border transition-all ${
                        opt.includes('(Correcta)')
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
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

      {/* Aulas QR Section */}
      <section id="aulas-qr" className="py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3.5 py-1 rounded-full">
                <Icon name="qrCode" size={15} />
                <span>Innovación en el Espacio Físico</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Aulas físicas con Códigos QR fijos y permanentes.
              </h2>

              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Olvidate de proyectar enlaces largos o generar códigos nuevos cada semana. En Habitar, cada salón de clases cuenta con un <strong>código QR permanente e inmutable</strong> que se imprime una sola vez y se pega en la pared del aula.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-sm shrink-0 border border-emerald-200 shadow-2xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Creación del aula física</h4>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">Definí materia, salón físico, grado, división y turno horario.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-sm shrink-0 border border-emerald-200 shadow-2xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Cartel QR Imprimible en un clic</h4>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">Generá el póster en formato A4 listo para imprimir y colocar en el aula física.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-sm shrink-0 border border-emerald-200 shadow-2xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Escáner integrado en la app docente</h4>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">La docente llega al salón, escanea el QR desde su celular y sube el archivo de lectura para ese grupo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Realistic A4 Poster Mockup */}
            <div className="lg:col-span-6 flex justify-center w-full">
              <div className="w-full max-w-md bg-white border-2 border-stone-300 rounded-3xl p-7 sm:p-8 shadow-xl text-center space-y-5 relative">
                <div className="inline-block bg-stone-100 text-stone-800 border border-stone-300 text-[10.5px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
                  Cartel Fijo Oficial de Aula
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">AULA 6° A — Salón 12</div>
                  <div className="text-xs text-stone-500 font-semibold mt-0.5">Turno Mañana · Escuela San Martín</div>
                </div>

                <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col items-center justify-center shadow-inner">
                  <div className="text-slate-900">
                    <Icon name="qrCode" size={120} />
                  </div>
                  <span className="font-mono text-xs font-black text-slate-900 mt-1.5 tracking-wider">AULA-6A-8A4F</span>
                </div>

                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  Escanear con la app docente de Habitar para cargar lectura y preguntas
                </p>

                <div className="pt-3 border-t border-stone-200 flex justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-stone-100 px-3.5 py-1.5 rounded-lg border border-stone-200 shadow-2xs">
                    <Icon name="printer" size={14} className="text-emerald-700" />
                    <span>Listo para imprimir en hoja A4</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Analítica Directiva Section */}
      <section id="analitica" className="py-20 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3.5 py-1 rounded-full mb-3">
              <Icon name="chart" size={14} />
              <span>Para Directores y Equipos de Conducción</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Visión Integral del Rendimiento Escolar
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl mx-auto">
              Detectá a tiempo a los estudiantes que necesitan apoyo, compará evoluciones entre trimestres y tomá decisiones pedagógicas respaldadas por evidencia real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
                <Icon name="alertTriangle" size={22} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Alertas Tempranas de Riesgo</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Algoritmos que detectan caídas en comprensión inferencial o crítica antes de las instancias de cierre, permitiendo intervenciones oportunas.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
                <Icon name="activity" size={22} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Comparador de Períodos</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Contrastá el rendimiento de un aula entre Período A y Período B con deltas porcentuales en cada uno de los tres ejes cognitivos.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center font-bold shadow-2xs">
                <Icon name="download" size={22} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Exportación Institucional</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Descargá reportes completos en formato Excel o PDF con un solo clic para presentar ante inspectores, supervisores o directivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Pricing Section */}
      <section id="precios" className="py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3.5 py-1 rounded-full mb-3">
              <Icon name="zap" size={14} />
              <span>Inversión Transparente para tu Escuela</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Planes de Suscripción Institucional
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Comenzá hoy con un piloto gratuito sin costo o elegí el plan que mejor se adapte al tamaño de tu institución educativa.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="mt-8 inline-flex items-center p-1.5 bg-stone-100 border border-stone-200 rounded-2xl shadow-inner">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="bg-emerald-200 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  2 meses gratis (17% OFF)
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isPopular = plan.id === 'estandar';
              const isPremium = plan.id === 'premium';
              const isPilot = plan.id === 'piloto';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all ${
                    isPremium
                      ? 'bg-slate-900 text-white shadow-xl border-2 border-slate-800'
                      : isPopular
                      ? 'bg-white border-2 border-emerald-600 shadow-xl scale-[1.02]'
                      : 'bg-white border border-stone-200 shadow-xs hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={`text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-xs whitespace-nowrap ${
                          isPremium
                            ? 'bg-emerald-400 text-slate-950'
                            : isPopular
                            ? 'bg-emerald-700 text-white'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="mb-4">
                      <h3 className={`text-2xl font-black ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isPremium ? 'text-slate-300' : 'text-stone-600'}`}>
                        {plan.description}
                      </p>
                    </div>

                    <div className="py-5 border-y border-stone-200/60 my-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl font-black ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                          {formatPrice(plan)}
                        </span>
                        <span className={`text-xs ${isPremium ? 'text-slate-300' : 'text-stone-500 font-medium'}`}>
                          {formatCycleLabel(plan)}
                        </span>
                      </div>
                      {billingCycle === 'ANNUAL' && plan.monthlyPriceArs > 0 && (
                        <div className={`text-xs mt-1.5 font-bold ${isPremium ? 'text-emerald-400' : 'text-emerald-750'}`}>
                          Equivale a ${Math.round((plan.annualPriceArs || plan.monthlyPriceArs * 10) / 12).toLocaleString('es-AR')}/mes
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs mb-6">
                      <div className={`p-3 rounded-xl ${isPremium ? 'bg-slate-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>Alumnos</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxStudents.toLocaleString('es-AR')}</div>
                      </div>
                      <div className={`p-3 rounded-xl ${isPremium ? 'bg-slate-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>Aulas QR</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxCourses}</div>
                      </div>
                      <div className={`p-3 rounded-xl ${isPremium ? 'bg-slate-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>Docentes</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxUsers}</div>
                      </div>
                      <div className={`p-3 rounded-xl ${isPremium ? 'bg-slate-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>Almacenamiento</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.storageGb} GB</div>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className={`font-bold uppercase tracking-wider text-[11px] ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>
                        Lo que incluye:
                      </div>
                      {(plan.features?.bullets || []).map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span className={`shrink-0 mt-0.5 ${isPremium ? 'text-emerald-400' : 'text-emerald-700 font-bold'}`}>
                            <Icon name="check" size={15} />
                          </span>
                          <span className={`leading-snug ${isPremium ? 'text-slate-200' : 'text-slate-800'}`}>
                            {bullet}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-stone-200/60">
                    <a
                      href={isPilot ? '/login' : '/login'}
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                        isPremium
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black'
                          : isPopular
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 border border-stone-200 text-slate-900'
                      }`}
                    >
                      <span>{isPilot ? 'Iniciar Piloto Gratuito' : `Elegir ${plan.name}`}</span>
                      <Icon name="arrowRight" size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Enterprise Banner */}
          <div className="mt-14 bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                ¿Gestionás una red escolar, congregación o distrito educativo?
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Configuramos planes personalizados con cupos a medida, facturación especial por orden de compra, soporte técnico presencial y capacitaciones docentes.
              </p>
            </div>
            <a
              href="mailto:contacto@habitar.lat?subject=Consulta%20Plan%20Institucional%20Habitar"
              className="bg-white border border-stone-300 hover:border-emerald-600 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-800 transition-all shrink-0 shadow-2xs"
            >
              Contactar con un Asesor
            </a>
          </div>
        </div>
      </section>

      {/* Normativa PBA & Privacy Section */}
      <section id="privacidad" className="py-20 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-4 py-1.5 rounded-full mb-3">
              <Icon name="shield" size={14} />
              <span>Seguridad Institucional & Soberanía de Datos</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Cumplimiento Normativo DGCyE PBA y Privacidad Escolar
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Habitar fue diseñado desde sus cimientos arquitectónicos para adaptarse a las exigencias jurídicas y pedagógicas de la <strong>Provincia de Buenos Aires</strong> (DGCyE / DIPREGEP), resguardando los derechos fundamentales de niñas, niños y adolescentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <Icon name="school" size={22} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Marco DGCyE & DIPREGEP
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Alineado a la <strong>Ley Provincial N° 13.688</strong> (Art. 16) y la <strong>Ley Nacional N° 26.061</strong>. Garantizamos el interés superior de la niñez, la preservación de la intimidad y la prohibición absoluta de explotación comercial o perfilamiento publicitario.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Icon name="check" size={14} />
                <span>Jurisdicción PBA</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <Icon name="lock" size={22} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Gobernanza B2B Escolar
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bajo la <strong>Ley 25.326</strong>, la Escuela es la exclusiva <em>Responsable del Tratamiento</em> de su matrícula. Habitar actúa estrictamente como <em>Encargado del Tratamiento</em>: no vendemos, no cedemos ni monetizamos ninguna información del alumnado.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Icon name="check" size={14} />
                <span>Contrato B2B con Escuelas</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <Icon name="sparkles" size={22} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  IA Pedagógica Ética
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Las producciones y respuestas de los alumnos <strong>nunca son utilizadas para entrenar modelos de IA</strong> públicos ni comerciales. La evaluación es asistiva; la toma de decisiones pedagógicas y calificaciones permanece siempre en el criterio docente humano.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Icon name="check" size={14} />
                <span>Supervisión Docente Obligatoria</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <Icon name="shield" size={22} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Derechos ARCO & Cifrado
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Cifrado de extremo a extremo en tránsito (TLS 1.3) y en reposo (AES-256). Ejercicio garantizado de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) ante solicitud formal de directivos o familias tutoras.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Icon name="check" size={14} />
                <span>Auditoría & Supresión Permanente</span>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-[#0A4D3C] to-[#0F6E56] rounded-3xl p-7 sm:p-9 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-2 text-center sm:text-left">
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
                Documento Institucional Oficial
              </div>
              <h4 className="text-lg sm:text-xl font-black text-white">
                Política Integral de Privacidad y Tratamiento de Datos Escolares
              </h4>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
                Consultá los 10 puntos de nuestro pliego legal completo: bases normativas PBA, roles contractuales, protocolos ante incidentes de ciberseguridad y vías de contacto del Oficial de Protección de Datos (DPO).
              </p>
            </div>
            <a
              href="/privacidad"
              className="bg-white hover:bg-emerald-50 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs sm:text-sm transition-all shrink-0 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Leer Política Completa PBA</span>
              <Icon name="arrowRight" size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3.5 py-1 rounded-full mb-3">
              <Icon name="helpCircle" size={14} />
              <span>Resolución de Dudas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              Todo lo que directores, docentes y coordinadores pedagógicos necesitan saber.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden transition-all shadow-2xs hover:border-stone-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`transition-transform duration-200 text-stone-400 shrink-0 font-mono ${isOpen ? 'rotate-180 text-emerald-700' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200/80 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#063327] via-[#0A4D3C] to-[#0F6E56] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-200">
            <span>Transformación Pedagógica en las Aulas</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white max-w-3xl mx-auto">
            Sumá tu escuela a la nueva era de la comprensión lectora.
          </h2>

          <p className="text-xs sm:text-base text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Iniciá hoy tu prueba piloto gratuita de 60 días sin compromiso y descubrí cómo el diagnóstico en tres ejes transforma los resultados de tus estudiantes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#precios"
              className="w-full sm:w-auto bg-white text-slate-950 hover:bg-emerald-50 px-8 py-4 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Planes & Comenzar Piloto</span>
              <Icon name="arrowRight" size={15} />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/25 px-7 py-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ingresar a la Plataforma</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-14 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center p-1 shadow-2xs">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain filter invert brightness-200" />
                </div>
                <span className="text-base font-black text-slate-900">
                  Habi<span className="text-emerald-700">tar</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-stone-500">
                Plataforma de evaluación y fortalecimiento de la comprensión lectora escolar mediante tres ejes cognitivos y aulas físicas QR.
              </p>
            </div>

            <div>
              <h5 className="font-extrabold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Plataforma</h5>
              <ul className="space-y-2 font-medium">
                <li><a href="/login" className="hover:text-emerald-700 transition-colors">Acceso Docentes</a></li>
                <li><a href="/login" className="hover:text-emerald-700 transition-colors">Portal Directivo</a></li>
                <li><a href="#aulas-qr" className="hover:text-emerald-700 transition-colors">Aulas QR Permanente</a></li>
                <li><a href="#precios" className="hover:text-emerald-700 transition-colors">Planes de Suscripción</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-extrabold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Normativa & Legal</h5>
              <ul className="space-y-2 font-medium">
                <li><a href="/privacidad" className="hover:text-emerald-700 font-bold text-emerald-850 transition-colors">Política de Privacidad PBA (DGCyE)</a></li>
                <li><a href="/consentimiento" className="hover:text-emerald-700 transition-colors">Consentimiento Menores (Ley 26.061)</a></li>
                <li><a href="/brand" className="hover:text-emerald-700 font-semibold text-emerald-800 transition-colors">Kit de Marca & Logos Oficiales</a></li>
                <li><a href="/privacidad#derechos-arco" className="hover:text-emerald-700 transition-colors">Gobernanza y Derechos ARCO</a></li>
                <li><a href="/status" className="hover:text-emerald-700 transition-colors">Estado del Sistema & SLA</a></li>
                <li><a href="/admin/api" className="hover:text-emerald-700 transition-colors">API para Desarrolladores</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-extrabold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Contacto Institucional</h5>
              <p className="text-xs leading-relaxed text-stone-500">
                Soporte y mesas de ayuda pedagógica para instituciones educativas de Argentina y Latinoamérica.
              </p>
              <div className="mt-3 text-emerald-850 font-bold text-xs">
                contacto@habitar.lat
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-stone-500">
            <div>
              © {new Date().getFullYear()} Habitar — Todos los derechos reservados. Proyecto de Tesis de Grado.
            </div>
            <div className="flex gap-4">
              <a href="/brand" className="hover:text-emerald-700 transition-colors">Kit de Marca</a>
              <a href="/privacidad" className="hover:text-emerald-700 font-bold text-emerald-850 transition-colors">Privacidad PBA</a>
              <a href="/consentimiento" className="hover:text-emerald-700 transition-colors">Consentimiento</a>
              <a href="/status" className="hover:text-emerald-700 transition-colors">Monitoreo SLA</a>
              <a href="/login" className="hover:text-emerald-700 transition-colors">Ingreso Seguro</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

