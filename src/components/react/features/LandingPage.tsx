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
  const [selectedDemoAnswer, setSelectedDemoAnswer] = useState<number | null>(null);
  const [demoFeedback, setDemoFeedback] = useState<boolean | null>(null);
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
      color: 'emerald',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      textAccent: 'text-emerald-800',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      sampleQuestion: 'Según el texto sobre biodiversidad, ¿cuál es la causa principal de la ruptura en cadena de los ecosistemas?',
      sampleOptions: [
        'A) El aumento estacional de las lluvias en zonas boscosas.',
        'B) La desaparición de una especie que altera las interdependencias ecológicas (Correcta).',
        'C) La rotación de cultivos en áreas agrícolas protegidas.',
        'D) El ciclo migratorio natural de las aves rapaces.',
      ],
      correctIndex: 1,
      cognitiveBenefit: 'Fortalece la lectura atenta, la extracción de datos concretos y la memoria de trabajo.',
      feedback: '¡Excelente! En el nivel literal, el alumno identifica directamente el dato explícito formulado en el texto.',
    },
    inferencial: {
      badge: 'Eje 2 · Nivel Comprensivo',
      title: 'Eje Inferencial — Lectura entre líneas y deducción contextual',
      description: 'Desafía al estudiante a deducir intenciones, relaciones causales no explícitas y significado de vocabulario por contexto.',
      color: 'amber',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      textAccent: 'text-amber-800',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      sampleQuestion: '¿Qué se puede inferir respecto a la relación entre la biodiversidad y la economía descrita por el autor?',
      sampleOptions: [
        'A) La conservación ecológica solo genera gastos innecesarios para el Estado.',
        'B) Los servicios ecosistémicos sustentan indirectamente actividades productivas humanas (Correcta).',
        'C) Solo los países industrializados pueden permitirse cuidar sus recursos naturales.',
        'D) Las economías modernas son totalmente independientes del medio ambiente.',
      ],
      correctIndex: 1,
      cognitiveBenefit: 'Desarrolla el razonamiento inductivo/deductivo y la integración profunda de ideas.',
      feedback: '¡Muy bien! En el nivel inferencial, el alumno conecta premisas dispersas para llegar a conclusiones no explícitas.',
    },
    critico: {
      badge: 'Eje 3 · Nivel Reflexivo',
      title: 'Eje Crítico — Juicio fundamentado y pensamiento reflexivo',
      description: 'Estimula la argumentación, la identificación de sesgos, la contrastación de perspectivas y la postura ética del alumno.',
      color: 'rose',
      bgLight: 'bg-rose-50',
      borderLight: 'border-rose-200',
      textAccent: 'text-rose-800',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      sampleQuestion: 'A partir de la tesis del texto, ¿cuál de los siguientes argumentos fundamenta mejor una política de protección ambiental comunitaria?',
      sampleOptions: [
        'A) Porque la preservación ecológica es una responsabilidad compartida de impacto ético y generacional (Correcta).',
        'B) Porque impone sanciones monetarias a las comunidades vecinas.',
        'C) Porque evita que otras regiones utilicen los recursos hídricos.',
        'D) Porque garantiza que los precios de los productos no sufran variaciones.',
      ],
      correctIndex: 0,
      cognitiveBenefit: 'Fomenta el pensamiento crítico, la toma de postura reflexiva y la fundamentación de ideas.',
      feedback: '¡Brillante! En el nivel crítico, el alumno evalúa argumentos, valores éticos y toma una postura justificada.',
    },
  };

  function handleAnswerSelect(index: number) {
    setSelectedDemoAnswer(index);
    const isCorrect = index === axisExamples[activeAxisTab].correctIndex;
    setDemoFeedback(isCorrect);
  }

  function handleTabChange(tab: 'literal' | 'inferencial' | 'critico') {
    setActiveAxisTab(tab);
    setSelectedDemoAnswer(null);
    setDemoFeedback(null);
  }

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
    <div className="min-h-screen bg-[#FDFCF7] text-stone-900 font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      
      {/* Dynamic Announcement Topbar */}
      <div className="bg-gradient-to-r from-[#0F6E56] via-[#14532D] to-[#0A4D3C] text-white text-xs py-2.5 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="bg-amber-400 text-stone-950 font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wide shadow-2xs">
              PILOTO GRATIS 60 DÍAS
            </span>
            <span className="font-semibold text-emerald-50">
              Probá Habitar en tu escuela sin costo ni tarjeta de crédito
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="#probar-demo" className="text-amber-300 hover:text-white font-bold underline transition-colors">
              Probar Demo en vivo ↓
            </a>
            <a href="#precios" className="text-white hover:text-emerald-200 font-bold bg-white/15 px-3 py-1 rounded-lg transition-colors">
              Ver Precios
            </a>
          </div>
        </div>
      </div>

      {/* Main Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#1D9E75] text-white flex items-center justify-center p-2 shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain filter invert brightness-200" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 block leading-none">
                Habi<span className="text-[#0F6E56]">tar</span>
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-extrabold block mt-0.5">
                Comprensión Lectora PBA
              </span>
            </div>
          </a>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-[13px] font-bold text-stone-600">
            <a href="#probar-demo" className="text-[#0F6E56] hover:text-[#0A4D3C] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              <span>⚡</span>
              <span>Probar Demo</span>
            </a>
            <a href="#precios" className="hover:text-[#0F6E56] transition-colors font-extrabold text-stone-900">
              Planes & Precios
            </a>
            <a href="#ejes" className="hover:text-[#0F6E56] transition-colors">3 Ejes Cognitivos</a>
            <a href="#aulas-qr" className="hover:text-[#0F6E56] transition-colors">Aulas QR</a>
            <a href="#analitica" className="hover:text-[#0F6E56] transition-colors">Analítica</a>
            <a href="#privacidad" className="hover:text-[#0F6E56] transition-colors text-emerald-850">Privacidad PBA</a>
            <a href="#faq" className="hover:text-[#0F6E56] transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {session ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl pl-2 pr-3 py-1">
                  <div className="w-7 h-7 rounded-lg bg-[#0F6E56] text-white font-bold text-xs flex items-center justify-center">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-900 leading-none truncate max-w-[110px]">
                      {session.user.name}
                    </span>
                    <span className="text-[9.5px] text-[#0F6E56] font-semibold mt-0.5">
                      {session.user.role === 'admin' ? 'Admin' : session.user.role === 'docente' ? 'Docente' : 'Directivo'}
                    </span>
                  </div>
                </div>

                <a
                  href={dashboardPathForRole(session.user.role)}
                  className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Mi Panel</span>
                  <Icon name="arrowRight" size={12} />
                </a>

                <button
                  onClick={() => {
                    clearSession();
                    setSession(null);
                  }}
                  className="text-stone-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 text-xs transition-colors"
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
                  className="text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-2 rounded-xl border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="text-sm">🎒</span>
                  <span>Soy Alumno</span>
                </button>

                <a
                  href="/login"
                  className="text-xs font-bold text-stone-700 hover:text-[#0F6E56] px-3.5 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Iniciar Sesión
                </a>

                <a
                  href="#precios"
                  className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Comenzar Piloto</span>
                  <Icon name="arrowRight" size={13} />
                </a>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100"
            aria-label="Menú"
          >
            <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>

        {/* Mobile menu drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-stone-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <nav className="flex flex-col space-y-1 text-sm font-bold text-stone-800">
              <a href="#probar-demo" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg bg-emerald-50 text-[#0F6E56]">⚡ Probar Demo en vivo</a>
              <a href="#precios" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100">💰 Planes & Precios (Subido arriba)</a>
              <a href="#ejes" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100">3 Ejes Cognitivos</a>
              <a href="#aulas-qr" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100">Aulas QR Físicas</a>
              <a href="#analitica" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100">Analítica Directiva</a>
              <a href="#privacidad" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100 text-emerald-850">Privacidad PBA</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-stone-100">Preguntas Frecuentes</a>
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
                  className="w-full py-2.5 text-xs font-bold text-emerald-950 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-center gap-2"
                >
                  <span>🎒</span>
                  <span>Soy Alumno / Entrar a clase</span>
                </button>
                <a
                  href="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-stone-800 border border-stone-300 rounded-xl"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-[#0F6E56] text-white rounded-xl text-xs font-bold"
                >
                  Comenzar Piloto Gratuito (60 días)
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* HERO SECTION — Punchy, Colorful & Action-Oriented */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-stone-200 bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Pill Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs px-3.5 py-1 rounded-full shadow-2xs">
                <span>🎒</span>
                <span>Alumnos sin registro</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs px-3.5 py-1 rounded-full shadow-2xs">
                <span>⚡</span>
                <span>3 Ejes: Literal, Inferencial y Crítico</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-900 border border-sky-300 font-extrabold text-xs px-3.5 py-1 rounded-full shadow-2xs">
                <span>📷</span>
                <span>QR Fijo en Pared</span>
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-950 tracking-tight leading-[1.08]">
              De la fotocopia al <span className="text-[#0F6E56] underline decoration-emerald-400 underline-offset-8">diagnóstico en tiempo real</span> en cada aula.
            </h1>

            <p className="text-base sm:text-lg text-stone-600 max-w-3xl mx-auto leading-relaxed">
              La plataforma diseñada para escuelas primarias y secundarias: diagnósticos en <strong>tres ejes cognitivos</strong> (Literal, Inferencial y Crítico), conexión física con <strong>códigos QR permanentes</strong> y <strong>analítica formativa en tiempo real</strong> para docentes y directivos.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <a
                href="#precios"
                className="w-full sm:w-auto bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-8 py-4 rounded-2xl text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Icon name="zap" size={18} className="text-amber-300 group-hover:scale-110 transition-transform" />
                <span>Comenzar Piloto Gratuito (60 días)</span>
              </a>

              <a
                href="#probar-demo"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-stone-950 px-7 py-4 rounded-2xl text-sm font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🎮</span>
                <span>Probar Demo Interactiva en Vivo</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                  window.location.href = '/actividad';
                }}
                className="w-full sm:w-auto bg-white hover:bg-stone-50 border-2 border-stone-300 text-stone-800 px-6 py-4 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🎒</span>
                <span>Ingreso Alumno</span>
              </button>
            </div>

            {/* 3 Quick Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 max-w-3xl mx-auto text-left">
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-2xs">
                <div className="text-2xl font-black text-[#0F6E56]">3 Ejes</div>
                <div className="text-xs font-semibold text-stone-600 mt-0.5">Diagnóstico calibrado en Literal, Inferencial y Crítico.</div>
              </div>
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-2xs">
                <div className="text-2xl font-black text-amber-800">100% QR Fijo</div>
                <div className="text-xs font-semibold text-stone-600 mt-0.5">Pegás el cartel en la pared una sola vez. Sin proyectores.</div>
              </div>
              <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-2xs">
                <div className="text-2xl font-black text-sky-800">ARCO / PBA</div>
                <div className="text-xs font-semibold text-stone-600 mt-0.5">Cumplimiento Ley 13.688, Ley 25.326 y Soberanía Escolar.</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: PROBAR DEMO INTERACTIVA EN VIVO */}
      <section id="probar-demo" className="py-16 sm:py-20 bg-gradient-to-b from-white to-emerald-50/50 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-950 bg-emerald-200 border border-emerald-400 px-3.5 py-1.5 rounded-full mb-3 shadow-2xs">
              <span>⚡ SIMULADOR EN VIVO</span>
              <span>·</span>
              <span>PROBALO AHORA MISMO</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Experimentá la evaluación en los Tres Ejes Cognitivos
            </h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Seleccioná un eje, leé el fragmento y hacé clic en una opción para ver la retroalimentación instantánea que recibe el estudiante y el docente.
            </p>
          </div>

          {/* Interactive Simulator Box */}
          <div className="bg-white border-2 border-[#0F6E56] rounded-3xl shadow-xl overflow-hidden">
            
            {/* Simulator Header */}
            <div className="bg-stone-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono font-bold text-stone-300 ml-2">Simulador de Aula: 6° A — Salón 12</span>
              </div>

              {/* Axis Selector Pills */}
              <div className="flex items-center gap-1.5 bg-stone-800 p-1 rounded-xl">
                <button
                  onClick={() => handleTabChange('literal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeAxisTab === 'literal'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Literal
                </button>
                <button
                  onClick={() => handleTabChange('inferencial')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeAxisTab === 'inferencial'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Inferencial
                </button>
                <button
                  onClick={() => handleTabChange('critico')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeAxisTab === 'critico'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Crítico
                </button>
              </div>
            </div>

            {/* Simulator Content */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Reading Card */}
              <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-stone-700">
                  <span className="flex items-center gap-1.5 text-[#0F6E56]">
                    <Icon name="fileText" size={14} />
                    Texto de lectura escolar: "Biodiversidad y Ecosistemas"
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">248 palabras · 6° Grado</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic bg-white p-3.5 rounded-xl border border-stone-200/80">
                  "La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para regular el clima, mantener los suelos fértiles y proveer agua limpia. La pérdida de una sola especie vegetal o animal genera efectos en cadena que impactan en la producción de alimentos y en la salud humana."
                </p>
              </div>

              {/* Active Question Box */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${axisExamples[activeAxisTab].badgeBg}`}>
                    {axisExamples[activeAxisTab].badge}
                  </span>
                  <span className="text-xs font-bold text-stone-500">
                    Beneficio: {axisExamples[activeAxisTab].cognitiveBenefit}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                  {axisExamples[activeAxisTab].sampleQuestion}
                </h3>

                {/* Multiple choice options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {axisExamples[activeAxisTab].sampleOptions.map((option, idx) => {
                    const isSelected = selectedDemoAnswer === idx;
                    const isCorrect = idx === axisExamples[activeAxisTab].correctIndex;
                    
                    let btnClass = 'bg-stone-50 border-stone-200 text-stone-800 hover:border-emerald-500 hover:bg-emerald-50/50';
                    if (isSelected) {
                      if (isCorrect) {
                        btnClass = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400';
                      } else {
                        btnClass = 'bg-rose-100 border-rose-500 text-rose-950 font-bold ring-2 ring-rose-400';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        className={`p-4 rounded-xl text-left text-xs sm:text-sm border-2 transition-all cursor-pointer shadow-2xs flex items-start justify-between gap-3 ${btnClass}`}
                      >
                        <span>{option}</span>
                        {isSelected && (
                          <span className="shrink-0 text-base font-black">
                            {isCorrect ? '✅' : '❌'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Feedback Message */}
                {selectedDemoAnswer !== null && (
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm border-2 animate-fadeIn ${
                    demoFeedback
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div className="font-bold flex items-center gap-2 mb-1">
                      <span>{demoFeedback ? '🎯 ¡Respuesta Correcta!' : '💡 Pista pedagógica:'}</span>
                    </div>
                    <p className="leading-relaxed">
                      {axisExamples[activeAxisTab].feedback}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Simulator Footer CTA */}
            <div className="bg-stone-50 p-4 sm:p-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-600 text-center sm:text-left">
                ¿Querés crear tus propias lecturas o importar textos escolares? <strong>El motor de IA calibra las 3 preguntas en segundos.</strong>
              </div>
              <a
                href="#precios"
                className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-xs transition-colors shrink-0"
              >
                Comenzar Piloto Gratis de 60 días →
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: PLANES Y PRECIOS (SUBIDO BIEN ARRIBA COMO PIDIÓ EL USUARIO) */}
      <section id="precios" className="py-16 sm:py-24 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-4 py-1.5 rounded-full mb-3 shadow-2xs">
              <Icon name="zap" size={14} />
              <span>INVERSIÓN TRANSPARENTE PARA TU ESCUELA</span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              Planes de Suscripción Institucional
            </h2>
            
            <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
              Comenzá hoy con un piloto 100% gratuito de 60 días sin costo ni tarjeta de crédito, o elegí el plan que mejor se adapte al tamaño de tu institución.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="mt-8 inline-flex items-center p-1.5 bg-stone-200/90 rounded-2xl border border-stone-300 shadow-inner">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white text-stone-950 shadow-xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Facturación Mensual
              </button>
              
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-[#0F6E56] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="bg-amber-300 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  2 meses gratis (17% OFF)
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
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
                      ? 'bg-stone-900 text-white border-2 border-stone-800 shadow-xl'
                      : isPopular
                      ? 'bg-white border-3 border-[#0F6E56] shadow-2xl scale-[1.03] ring-4 ring-emerald-100'
                      : 'bg-white border-2 border-stone-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span
                        className={`text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap ${
                          isPremium
                            ? 'bg-cyan-400 text-stone-950'
                            : isPopular
                            ? 'bg-[#0F6E56] text-white border-2 border-white'
                            : 'bg-stone-100 text-stone-800 border border-stone-300'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className={`text-2xl sm:text-3xl font-black ${isPremium ? 'text-white' : 'text-stone-950'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isPremium ? 'text-stone-300' : 'text-stone-600'}`}>
                        {plan.description}
                      </p>
                    </div>

                    {/* Price banner */}
                    <div className={`py-5 border-y my-5 ${isPremium ? 'border-stone-800' : 'border-stone-200'}`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl font-black ${isPremium ? 'text-white' : 'text-stone-950'}`}>
                          {formatPrice(plan)}
                        </span>
                        <span className={`text-xs font-semibold ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>
                          {formatCycleLabel(plan)}
                        </span>
                      </div>
                      {billingCycle === 'ANNUAL' && plan.monthlyPriceArs > 0 && (
                        <div className={`text-xs mt-1 font-extrabold ${isPremium ? 'text-cyan-400' : 'text-[#0F6E56]'}`}>
                          Equivale a ${Math.round((plan.annualPriceArs || plan.monthlyPriceArs * 10) / 12).toLocaleString('es-AR')}/mes
                        </div>
                      )}
                    </div>

                    {/* Capacity Specs 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs mb-6">
                      <div className={`p-3 rounded-2xl ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-black ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Alumnos</div>
                        <div className="font-black text-base mt-0.5">{plan.maxStudents.toLocaleString('es-AR')}</div>
                      </div>
                      <div className={`p-3 rounded-2xl ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-black ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Aulas QR</div>
                        <div className="font-black text-base mt-0.5">{plan.maxCourses}</div>
                      </div>
                      <div className={`p-3 rounded-2xl ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-black ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Docentes</div>
                        <div className="font-black text-base mt-0.5">{plan.maxUsers}</div>
                      </div>
                      <div className={`p-3 rounded-2xl ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-black ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Almacenamiento</div>
                        <div className="font-black text-base mt-0.5">{plan.storageGb} GB</div>
                      </div>
                    </div>

                    {/* Bullet features list */}
                    <div className="space-y-3 text-xs sm:text-[13px]">
                      <div className={`font-black uppercase tracking-wider text-[11px] ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>
                        Lo que incluye:
                      </div>
                      {(plan.features?.bullets || []).map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span className={`shrink-0 mt-0.5 font-black ${isPremium ? 'text-cyan-400' : 'text-[#0F6E56]'}`}>
                            <Icon name="check" size={15} />
                          </span>
                          <span className={`leading-snug font-medium ${isPremium ? 'text-stone-200' : 'text-stone-800'}`}>
                            {bullet}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Button */}
                  <div className="mt-8 pt-5 border-t border-stone-200/40">
                    <a
                      href={isPilot ? '/login' : '/login'}
                      className={`w-full py-4 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                        isPremium
                          ? 'bg-cyan-400 hover:bg-cyan-300 text-stone-950 shadow-md'
                          : isPopular
                          ? 'bg-[#0F6E56] hover:bg-[#0A4D3C] text-white shadow-md hover:scale-[1.01]'
                          : 'bg-stone-100 hover:bg-stone-200 border-2 border-stone-300 text-stone-900'
                      }`}
                    >
                      <span>{isPilot ? 'Iniciar Piloto Gratuito (60 días)' : `Elegir ${plan.name}`}</span>
                      <Icon name="arrowRight" size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise / District Callout Banner */}
          <div className="mt-14 bg-white border-2 border-stone-300 rounded-3xl p-7 sm:p-9 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-[11px] font-black uppercase text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full">
                Redes Educativas & Distritos
              </span>
              <h4 className="text-lg sm:text-xl font-black text-stone-950 mt-1">
                ¿Gestionás una red escolar, congregación o distrito educativo?
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Configuramos planes personalizados con cupos a medida, facturación especial por orden de compra, soporte técnico presencial y capacitaciones docentes.
              </p>
            </div>
            <a
              href="mailto:contacto@habitar.lat?subject=Consulta%20Plan%20Institucional%20Habitar"
              className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 shadow-sm"
            >
              Contactar con un Asesor
            </a>
          </div>

        </div>
      </section>

      {/* SECTION: 3 EJES COGNITIVOS EN DETALLE (CARDS COLORIDAS) */}
      <section id="ejes" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-full mb-3">
              <Icon name="layers" size={13} />
              <span>MARCO PEDAGÓGICO VALIDADO</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              Los Tres Ejes de la Comprensión Lectora
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
              Superamos la simple memorización. Habitar estructura cada evaluación en tres dimensiones cognitivas complementarias para diagnosticar con precisión el nivel de cada alumno.
            </p>
          </div>

          {/* 3 Large Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Literal Card */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-7 flex flex-col justify-between space-y-5 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  1
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Nivel Explícito
                </div>
                <h3 className="text-xl font-black text-stone-950">
                  Eje Literal
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Evalúa la capacidad de ubicar hechos, personajes, cronología y datos textuales tal como fueron formulados en la lectura.
                </p>
              </div>
              <div className="pt-4 border-t border-emerald-200 text-xs font-bold text-emerald-950 bg-white p-3 rounded-xl border border-emerald-200">
                🌱 {axisExamples.literal.cognitiveBenefit}
              </div>
            </div>

            {/* Inferencial Card */}
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-7 flex flex-col justify-between space-y-5 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  2
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Nivel Comprensivo
                </div>
                <h3 className="text-xl font-black text-stone-950">
                  Eje Inferencial
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Desafía al estudiante a deducir intenciones, relaciones causales no explícitas y significado de vocabulario por contexto.
                </p>
              </div>
              <div className="pt-4 border-t border-amber-200 text-xs font-bold text-amber-950 bg-white p-3 rounded-xl border border-amber-200">
                🔍 {axisExamples.inferencial.cognitiveBenefit}
              </div>
            </div>

            {/* Crítico Card */}
            <div className="bg-rose-50/70 border-2 border-rose-300 rounded-3xl p-7 flex flex-col justify-between space-y-5 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  3
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-rose-800">
                  Nivel Reflexivo
                </div>
                <h3 className="text-xl font-black text-stone-950">
                  Eje Crítico
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Estimula la argumentación, la identificación de sesgos, la contrastación de perspectivas y la postura ética del alumno.
                </p>
              </div>
              <div className="pt-4 border-t border-rose-200 text-xs font-bold text-rose-950 bg-white p-3 rounded-xl border border-rose-200">
                ⚖️ {axisExamples.critico.cognitiveBenefit}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: AULAS FÍSICAS CON QR PERMANENTE */}
      <section id="aulas-qr" className="py-20 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-full">
                <Icon name="qrCode" size={13} />
                <span>INNOVACIÓN EN EL ESPACIO FÍSICO</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight">
                Aulas físicas con Códigos QR fijos y permanentes.
              </h2>

              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Olvidate de proyectar enlaces largos o generar códigos nuevos cada semana. En Habitar, cada salón de clases cuenta con un <strong>código QR permanente e inmutable</strong> que se imprime una sola vez y se pega en la pared del aula.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0F6E56] flex items-center justify-center font-black text-sm shrink-0 border border-emerald-300">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-950">Creación del aula física</h4>
                    <p className="text-xs text-stone-600 mt-0.5">Definí materia, salón físico, grado, división y turno horario.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-950">Cartel QR Imprimible en un clic</h4>
                    <p className="text-xs text-stone-600 mt-0.5">Generá el póster en formato A4 listo para imprimir y colocar en el aula física.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center font-black text-sm shrink-0 border border-sky-300">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-950">Escáner integrado en la app docente</h4>
                    <p className="text-xs text-stone-600 mt-0.5">La docente llega al salón, escanea el QR desde su celular y sube el archivo de lectura para ese grupo.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* A4 Poster Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm bg-white border-3 border-stone-400 rounded-3xl p-7 shadow-xl text-center space-y-5">
                <div className="inline-block bg-stone-100 text-stone-900 border border-stone-300 text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                  Cartel Fijo Oficial de Aula
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-950">AULA 6° A — Salón 12</div>
                  <div className="text-xs text-stone-500 font-bold mt-0.5">Turno Mañana · Escuela San Martín</div>
                </div>

                <div className="w-48 h-48 mx-auto bg-stone-50 p-4 rounded-2xl border-2 border-stone-200 flex flex-col items-center justify-center shadow-inner">
                  <div className="text-stone-950">
                    <Icon name="qrCode" size={120} />
                  </div>
                  <span className="font-mono text-xs font-black text-stone-950 mt-1.5 tracking-wider">AULA-6A-8A4F</span>
                </div>

                <p className="text-xs text-stone-500 max-w-xs mx-auto font-medium">
                  Escanear con la app docente de Habitar para cargar lectura y preguntas
                </p>

                <div className="pt-3 border-t border-stone-200 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 bg-stone-100 px-4 py-2 rounded-xl border border-stone-300 shadow-2xs">
                    <Icon name="printer" size={14} className="text-[#0F6E56]" />
                    <span>Listo para imprimir en hoja A4</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: ANALÍTICA DIRECTIVA */}
      <section id="analitica" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-full mb-3">
              <Icon name="chart" size={13} />
              <span>PARA DIRECTORES Y EQUIPOS DE CONDUCCIÓN</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              Visión Integral del Rendimiento Escolar
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl mx-auto">
              Detectá a tiempo a los estudiantes que necesitan apoyo, compará evoluciones entre trimestres y tomá decisiones pedagógicas respaldadas por evidencia real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            
            <div className="bg-amber-50/50 border-2 border-amber-200 rounded-3xl p-7 space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs">
                <Icon name="alertTriangle" size={22} />
              </div>
              <h3 className="text-lg font-black text-stone-950">Alertas Tempranas de Riesgo</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Algoritmos que detectan caídas en comprensión inferencial o crítica antes de las instancias de cierre, permitiendo intervenciones oportunas.
              </p>
            </div>

            <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-3xl p-7 space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-2xs">
                <Icon name="activity" size={22} />
              </div>
              <h3 className="text-lg font-black text-stone-950">Comparador de Períodos</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Contrastá el rendimiento de un aula entre Período A y Período B con deltas porcentuales en cada uno de los tres ejes cognitivos.
              </p>
            </div>

            <div className="bg-sky-50/50 border-2 border-sky-200 rounded-3xl p-7 space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black shadow-2xs">
                <Icon name="download" size={22} />
              </div>
              <h3 className="text-lg font-black text-stone-950">Exportación Institucional</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Descargá reportes completos en formato Excel o PDF con un solo clic para presentar ante inspectores, supervisores o directivos.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: NORMATIVA PBA & PRIVACIDAD */}
      <section id="privacidad" className="py-20 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-4 py-1.5 rounded-full mb-3">
              <Icon name="shield" size={13} />
              <span>SEGURIDAD INSTITUCIONAL & SOBERANÍA DE DATOS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              Cumplimiento Normativo DGCyE PBA y Privacidad Escolar
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Habitar fue diseñado desde sus cimientos arquitectónicos para adaptarse a las exigencias jurídicas y pedagógicas de la <strong>Provincia de Buenos Aires</strong> (DGCyE / DIPREGEP), resguardando los derechos fundamentales de niñas, niños y adolescentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#0F6E56] flex items-center justify-center font-black">
                  <Icon name="school" size={22} />
                </div>
                <h3 className="font-black text-base text-stone-950">
                  Marco DGCyE & DIPREGEP
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Alineado a la <strong>Ley Provincial N° 13.688</strong> (Art. 16) y la <strong>Ley Nacional N° 26.061</strong>. Garantizamos el interés superior de la niñez, la preservación de la intimidad y la prohibición absoluta de explotación comercial o perfilamiento publicitario.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-black text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Jurisdicción PBA</span>
              </div>
            </div>

            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                  <Icon name="lock" size={22} />
                </div>
                <h3 className="font-black text-base text-stone-950">
                  Gobernanza B2B Escolar
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bajo la <strong>Ley 25.326</strong>, la Escuela es la exclusiva <em>Responsable del Tratamiento</em> de su matrícula. Habitar actúa estrictamente como <em>Encargado del Tratamiento</em>: no vendemos, no cedemos ni monetizamos ninguna información del alumnado.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-black text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Contrato B2B con Escuelas</span>
              </div>
            </div>

            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                  <Icon name="sparkles" size={22} />
                </div>
                <h3 className="font-black text-base text-stone-950">
                  IA Pedagógica Ética
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Las producciones y respuestas de los alumnos <strong>nunca son utilizadas para entrenar modelos de IA</strong> públicos ni comerciales. La evaluación es asistiva; la toma de decisiones pedagógicas y calificaciones permanece siempre en el criterio docente humano.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-black text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Supervisión Docente Obligatoria</span>
              </div>
            </div>

            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-900 flex items-center justify-center font-black">
                  <Icon name="shield" size={22} />
                </div>
                <h3 className="font-black text-base text-stone-950">
                  Derechos ARCO & Cifrado
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Cifrado de extremo a extremo en tránsito (TLS 1.3) y en reposo (AES-256). Ejercicio garantizado de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) ante solicitud formal de directivos o familias tutoras.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-black text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Auditoría & Supresión Permanente</span>
              </div>
            </div>

          </div>

          <div className="mt-12 bg-[#0F6E56] rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Documento Institucional Oficial
              </div>
              <h4 className="text-lg sm:text-xl font-black text-white">
                Política Integral de Privacidad y Tratamiento de Datos Escolares
              </h4>
              <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                Consultá los 10 puntos de nuestro pliego legal completo: bases normativas PBA, roles contractuales, protocolos ante incidentes de ciberseguridad y vías de contacto del Oficial de Protección de Datos (DPO).
              </p>
            </div>
            <a
              href="/privacidad"
              className="bg-white hover:bg-emerald-50 text-stone-950 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shrink-0 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Leer Política Completa PBA</span>
              <Icon name="arrowRight" size={14} />
            </a>
          </div>

        </div>
      </section>

      {/* SECTION: PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 border border-emerald-300 px-4 py-1.5 rounded-full mb-3">
              <Icon name="helpCircle" size={13} />
              <span>RESOLUCIÓN DE DUDAS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
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
                  className="bg-white border-2 border-stone-200 rounded-2xl overflow-hidden transition-all shadow-2xs hover:border-stone-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-stone-950 hover:text-[#0F6E56] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`transition-transform duration-200 text-stone-400 shrink-0 font-mono ${isOpen ? 'rotate-180 text-[#0F6E56]' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200 pt-3.5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-br from-[#063327] via-[#0A4D3C] to-[#0F6E56] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1 text-xs font-bold text-emerald-200">
            <span>Transformación Pedagógica en las Aulas</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            Sumá tu escuela a la nueva era de la comprensión lectora.
          </h2>

          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Iniciá hoy tu prueba piloto gratuita de 60 días sin compromiso y descubrí cómo el diagnóstico en tres ejes transforma los resultados de tus estudiantes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
            <a
              href="#precios"
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-stone-950 px-8 py-4 rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Planes & Comenzar Piloto</span>
              <Icon name="arrowRight" size={14} />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 px-7 py-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ingresar a la Plataforma</span>
            </a>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-14 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center p-1.5 shadow-2xs">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain filter invert brightness-200" />
                </div>
                <span className="text-lg font-black text-stone-950">
                  Habi<span className="text-[#0F6E56]">tar</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-stone-500">
                Plataforma de evaluación y fortalecimiento de la comprensión lectora escolar mediante tres ejes cognitivos y aulas físicas QR.
              </p>
            </div>

            <div>
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[11px]">Plataforma</h5>
              <ul className="space-y-2 font-medium">
                <li><a href="/login" className="hover:text-[#0F6E56]">Acceso Docentes</a></li>
                <li><a href="/login" className="hover:text-[#0F6E56]">Portal Directivo</a></li>
                <li><a href="#aulas-qr" className="hover:text-[#0F6E56]">Aulas QR Permanente</a></li>
                <li><a href="#precios" className="hover:text-[#0F6E56]">Planes de Suscripción</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[11px]">Normativa & Legal</h5>
              <ul className="space-y-2 font-medium">
                <li><a href="/privacidad" className="hover:text-[#0F6E56] font-bold text-emerald-850">Política de Privacidad PBA (DGCyE)</a></li>
                <li><a href="/consentimiento" className="hover:text-[#0F6E56]">Consentimiento Menores (Ley 26.061)</a></li>
                <li><a href="/brand" className="hover:text-[#0F6E56]">Kit de Marca & Logos</a></li>
                <li><a href="/privacidad#derechos-arco" className="hover:text-[#0F6E56]">Gobernanza y Derechos ARCO</a></li>
                <li><a href="/status" className="hover:text-[#0F6E56]">Estado del Sistema & SLA</a></li>
                <li><a href="/admin/api" className="hover:text-[#0F6E56]">API para Desarrolladores</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[11px]">Contacto Institucional</h5>
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
            <div className="flex gap-4 font-semibold">
              <a href="/brand" className="hover:text-[#0F6E56]">Kit de Marca</a>
              <a href="/privacidad" className="hover:text-[#0F6E56] text-emerald-850">Privacidad PBA</a>
              <a href="/consentimiento" className="hover:text-[#0F6E56]">Consentimiento</a>
              <a href="/status" className="hover:text-[#0F6E56]">Monitoreo SLA</a>
              <a href="/login" className="hover:text-[#0F6E56]">Ingreso Seguro</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}


