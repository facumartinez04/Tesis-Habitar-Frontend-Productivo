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
      metricLabel: 'Comprensión Textual Directa',
      stat: '92%',
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
      metricLabel: 'Deducción y Causalidad',
      stat: '74%',
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
      metricLabel: 'Argumentación y Postura Ética',
      stat: '68%',
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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      
      {/* Editorial Top Bar */}
      <div className="border-b border-stone-200 bg-[#0F6E56] text-white text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-800/90 text-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border border-emerald-700/50">
              PBA · DGCyE
            </span>
            <span className="font-medium text-emerald-50">
              Plataforma institucional adaptada al marco educativo de la Provincia de Buenos Aires
            </span>
          </div>
          <a href="#privacidad" className="text-emerald-200 hover:text-white font-semibold underline text-[11px] transition-colors shrink-0">
            Conocer pliego de gobernanza y privacidad →
          </a>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain filter invert brightness-200" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-stone-900 block leading-none">
                Habitar<span className="text-[#0F6E56]">.</span>
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold block mt-0.5">
                Comprensión Lectora Escolar
              </span>
            </div>
          </a>

          {/* Navigation links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-stone-600">
            <a href="#ejes" className="hover:text-[#0F6E56] transition-colors py-1">3 Ejes Cognitivos</a>
            <a href="#aulas-qr" className="hover:text-[#0F6E56] transition-colors py-1">Aulas QR Físicas</a>
            <a href="#analitica" className="hover:text-[#0F6E56] transition-colors py-1">Analítica Directiva</a>
            <a href="#precios" className="hover:text-[#0F6E56] transition-colors py-1">Planes Institucionales</a>
            <a href="#privacidad" className="hover:text-[#0F6E56] transition-colors py-1 text-emerald-850">Privacidad PBA</a>
            <a href="#faq" className="hover:text-[#0F6E56] transition-colors py-1">Preguntas Frecuentes</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-white border border-stone-200 rounded-xl pl-2 pr-3.5 py-1.5 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-[#0F6E56] text-white font-bold text-xs flex items-center justify-center">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-900 leading-none truncate max-w-[120px]">
                      {session.user.name}
                    </span>
                    <span className="text-[10px] text-[#0F6E56] font-semibold mt-0.5">
                      {session.user.role === 'admin' ? 'Admin' : session.user.role === 'docente' ? 'Docente' : 'Directivo'}
                    </span>
                  </div>
                </div>

                <a
                  href={dashboardPathForRole(session.user.role)}
                  className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Mi Panel</span>
                  <Icon name="arrowRight" size={13} />
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
                  className="text-xs font-bold text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/70 px-3.5 py-2 rounded-xl border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="text-sm">🎒</span>
                  <span>Soy Alumno</span>
                </button>

                <a
                  href="/login"
                  className="text-xs font-bold text-stone-700 hover:text-[#0F6E56] px-3.5 py-2 rounded-xl hover:bg-stone-200/50 transition-colors"
                >
                  Iniciar Sesión
                </a>

                <a
                  href="#precios"
                  className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Piloto Gratis</span>
                  <Icon name="arrowRight" size={13} />
                </a>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-stone-200 px-5 pt-4 pb-6 space-y-4 shadow-xl">
            {session && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0F6E56] text-white font-bold text-xs flex items-center justify-center">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">{session.user.name}</div>
                    <div className="text-[10px] text-[#0F6E56] font-semibold">{session.user.role}</div>
                  </div>
                </div>
                <a
                  href={dashboardPathForRole(session.user.role)}
                  className="bg-[#0F6E56] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  Ir al panel
                </a>
              </div>
            )}

            <nav className="flex flex-col space-y-1 text-sm font-bold text-stone-700">
              <a href="#ejes" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100">3 Ejes Cognitivos</a>
              <a href="#aulas-qr" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100">Aulas QR Físicas</a>
              <a href="#analitica" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100">Analítica Directiva</a>
              <a href="#precios" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100">Planes Institucionales</a>
              <a href="#privacidad" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100 text-emerald-850">Privacidad PBA</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-stone-100">Preguntas Frecuentes</a>
            </nav>

            {!session && (
              <div className="pt-3 border-t border-stone-200 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                    setIsMobileMenuOpen(false);
                    window.location.href = '/actividad';
                  }}
                  className="w-full py-3 text-xs font-bold text-emerald-950 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-center gap-2"
                >
                  <span>🎒</span>
                  <span>Soy Alumno / Entrar a clase</span>
                </button>
                <a
                  href="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-stone-800 border border-stone-300 rounded-xl hover:bg-stone-50"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="#precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-[#0F6E56] text-white rounded-xl text-xs font-bold"
                >
                  Comenzar Piloto Gratuito (60 días)
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section — Clean, Editorial & Authentic */}
      <section className="pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-stone-200 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 bg-stone-200/70 border border-stone-300 rounded-full px-3.5 py-1 text-xs font-bold text-stone-800">
                <span className="w-2 h-2 rounded-full bg-[#0F6E56]" />
                <span>Pedagogía Escolar Argentina · Ciclo Lectivo 2026</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black tracking-tight text-stone-950 leading-[1.08]">
                Fortalecé la <span className="text-[#0F6E56] underline decoration-stone-300 underline-offset-8">comprensión lectora</span> en cada aula de tu escuela.
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-normal">
                La plataforma diseñada para escuelas primarias y secundarias: diagnósticos en <strong>tres ejes cognitivos</strong> (Literal, Inferencial y Crítico), conexión física con <strong>códigos QR permanentes</strong> y <strong>analítica formativa en tiempo real</strong> para docentes y directivos.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href="#precios"
                  className="bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-7 py-4 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <Icon name="zap" size={16} className="text-emerald-300" />
                  <span>Comenzar Piloto Gratuito (60 días)</span>
                </a>

                <a
                  href="#aulas-qr"
                  className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 px-6 py-4 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="qrCode" size={16} className="text-[#0F6E56]" />
                  <span>Conocer Aulas QR</span>
                </a>
              </div>

              {/* 3 Value Pillars */}
              <div className="pt-6 border-t border-stone-200 grid grid-cols-3 gap-3 text-left">
                <div className="p-2.5">
                  <div className="text-xl font-black text-stone-900">3 Ejes</div>
                  <div className="text-xs text-stone-500 font-medium leading-tight mt-0.5">Literal, Inferencial y Crítico</div>
                </div>
                <div className="p-2.5 border-l border-stone-200">
                  <div className="text-xl font-black text-stone-900">100% QR</div>
                  <div className="text-xs text-stone-500 font-medium leading-tight mt-0.5">Fijo en pared sin proyector</div>
                </div>
                <div className="p-2.5 border-l border-stone-200">
                  <div className="text-xl font-black text-stone-900">ARCO / PBA</div>
                  <div className="text-xs text-stone-500 font-medium leading-tight mt-0.5">Privacidad y Ley 25.326</div>
                </div>
              </div>

            </div>

            {/* Right Tangible Classroom Workspace Preview */}
            <div className="lg:col-span-6 w-full">
              <div className="bg-white border-2 border-stone-300 rounded-2xl shadow-md overflow-hidden">
                
                {/* Classroom Header Bar */}
                <div className="bg-stone-100 px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono font-bold text-stone-600 ml-2">habitar://aula/6A-SALON-12</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F6E56] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
                    En vivo · 26 alumnos
                  </span>
                </div>

                {/* Workspace Body */}
                <div className="p-6 space-y-5">
                  
                  {/* Reading Card */}
                  <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <Icon name="fileText" size={14} className="text-[#0F6E56]" />
                        Lectura: Biodiversidad y Ecosistemas
                      </span>
                      <span className="text-[10px] font-bold text-stone-500 uppercase bg-stone-200/80 px-2 py-0.5 rounded">
                        248 palabras
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed italic bg-white p-3 rounded-lg border border-stone-200">
                      "La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí..."
                    </p>
                  </div>

                  {/* 3 Questions breakdown */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-stone-500 uppercase tracking-wider">
                      Diagnóstico Calibrado por Ejes
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="text-xs font-bold text-stone-800">1. Causa de ruptura ecosistémica</span>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Literal · 92%
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="text-xs font-bold text-stone-800">2. Inferencia economía y conservación</span>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Inferencial · 74%
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="text-xs font-bold text-stone-800">3. Argumentación sobre ética ambiental</span>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                          Crítico · 68%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom live stats */}
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Respuestas recibidas: <strong className="text-stone-900">26 de 28</strong></span>
                    <span className="text-[#0F6E56] font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      89% Comprensión Global
                    </span>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3 Cognitive Axes Section */}
      <section id="ejes" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="layers" size={13} />
              <span>Marco Pedagógico Validado</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Los Tres Ejes de la Comprensión Lectora
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-xl mx-auto">
              Superamos la simple memorización. Habitar estructura cada evaluación en tres dimensiones cognitivas complementarias para diagnosticar con precisión el nivel de cada alumno.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Axis Segment Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-100 border border-stone-200 rounded-xl mb-8">
              <button
                onClick={() => setActiveAxisTab('literal')}
                className={`py-3 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'literal'
                    ? 'bg-white text-emerald-950 shadow-xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Literal</span>
              </button>

              <button
                onClick={() => setActiveAxisTab('inferencial')}
                className={`py-3 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'inferencial'
                    ? 'bg-white text-amber-950 shadow-xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span>Inferencial</span>
              </button>

              <button
                onClick={() => setActiveAxisTab('critico')}
                className={`py-3 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeAxisTab === 'critico'
                    ? 'bg-white text-rose-950 shadow-xs border border-stone-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>Crítico</span>
              </button>
            </div>

            {/* Axis Details Card */}
            <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl p-6 sm:p-8 space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 pb-6 border-b border-stone-200">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-[#0F6E56] mb-1">
                    {axisExamples[activeAxisTab].badge}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950">
                    {axisExamples[activeAxisTab].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    {axisExamples[activeAxisTab].description}
                  </p>
                </div>
                <div className="shrink-0 bg-white text-stone-800 border border-stone-200 text-xs font-bold px-4 py-2 rounded-xl shadow-2xs">
                  {axisExamples[activeAxisTab].cognitiveBenefit}
                </div>
              </div>

              {/* Sample Question Box */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Ejemplo de ítem pedagógico generado:
                </div>
                <div className="text-sm font-bold text-stone-900 leading-snug">
                  {axisExamples[activeAxisTab].sampleQuestion}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {axisExamples[activeAxisTab].sampleOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-lg text-xs border ${
                        opt.includes('(Correcta)')
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
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
      <section id="aulas-qr" className="py-20 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full">
                <Icon name="qrCode" size={13} />
                <span>Innovación en el Espacio Físico</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight leading-tight">
                Aulas físicas con Códigos QR fijos y permanentes.
              </h2>

              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Olvidate de proyectar enlaces largos o generar códigos nuevos cada semana. En Habitar, cada salón de clases cuenta con un <strong>código QR permanente e inmutable</strong> que se imprime una sola vez y se pega en la pared del aula.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-3.5 bg-white border border-stone-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm shrink-0 border border-stone-200">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Creación del aula física</h4>
                    <p className="text-xs text-stone-600 mt-0.5">Definí materia, salón físico, grado, división y turno horario.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3.5 bg-white border border-stone-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm shrink-0 border border-stone-200">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Cartel QR Imprimible en un clic</h4>
                    <p className="text-xs text-stone-600 mt-0.5">Generá el póster en formato A4 listo para imprimir y colocar en el aula física.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3.5 bg-white border border-stone-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm shrink-0 border border-stone-200">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Escáner integrado en la app docente</h4>
                    <p className="text-xs text-stone-600 mt-0.5">La docente llega al salón, escanea el QR desde su celular y sube el archivo de lectura para ese grupo.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* A4 Poster Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm bg-white border-2 border-stone-300 rounded-2xl p-7 shadow-md text-center space-y-4">
                <div className="inline-block bg-stone-100 text-stone-800 border border-stone-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Cartel Fijo Oficial de Aula
                </div>
                <div>
                  <div className="text-xl font-black text-stone-950">AULA 6° A — Salón 12</div>
                  <div className="text-xs text-stone-500 font-semibold mt-0.5">Turno Mañana · Escuela San Martín</div>
                </div>

                <div className="w-44 h-44 mx-auto bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col items-center justify-center">
                  <div className="text-stone-900">
                    <Icon name="qrCode" size={110} />
                  </div>
                  <span className="font-mono text-xs font-black text-stone-900 mt-1">AULA-6A-8A4F</span>
                </div>

                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Escanear con la app docente de Habitar para cargar lectura y preguntas
                </p>

                <div className="pt-2 border-t border-stone-200 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                    <Icon name="printer" size={13} className="text-[#0F6E56]" />
                    <span>Listo para imprimir en hoja A4</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Analítica Directiva Section */}
      <section id="analitica" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="chart" size={13} />
              <span>Para Directores y Equipos de Conducción</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Visión Integral del Rendimiento Escolar
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-xl mx-auto">
              Detectá a tiempo a los estudiantes que necesitan apoyo, compará evoluciones entre trimestres y tomá decisiones pedagógicas respaldadas por evidencia real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold border border-amber-300">
                <Icon name="alertTriangle" size={18} />
              </div>
              <h3 className="text-base font-black text-stone-950">Alertas Tempranas de Riesgo</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Algoritmos que detectan caídas en comprensión inferencial o crítica antes de las instancias de cierre, permitiendo intervenciones oportunas.
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold border border-emerald-300">
                <Icon name="activity" size={18} />
              </div>
              <h3 className="text-base font-black text-stone-950">Comparador de Períodos</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Contrastá el rendimiento de un aula entre Período A y Período B con deltas porcentuales en cada uno de los tres ejes cognitivos.
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center font-bold border border-sky-300">
                <Icon name="download" size={18} />
              </div>
              <h3 className="text-base font-black text-stone-950">Exportación Institucional</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Descargá reportes completos en formato Excel o PDF con un solo clic para presentar ante inspectores, supervisores o directivos.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="zap" size={13} />
              <span>Inversión Transparente para tu Escuela</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Planes de Suscripción Institucional
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Comenzá hoy con un piloto gratuito sin costo o elegí el plan que mejor se adapte al tamaño de tu institución educativa.
            </p>

            {/* Toggle switch */}
            <div className="mt-8 inline-flex items-center p-1 bg-stone-200 rounded-xl border border-stone-300">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-[#0F6E56] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="bg-emerald-200 text-emerald-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
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
                  className={`relative flex flex-col justify-between rounded-2xl p-7 transition-all ${
                    isPremium
                      ? 'bg-stone-900 text-white border-2 border-stone-800 shadow-lg'
                      : isPopular
                      ? 'bg-white border-2 border-[#0F6E56] shadow-lg scale-[1.02]'
                      : 'bg-white border border-stone-300 shadow-xs'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={`text-[10.5px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs whitespace-nowrap ${
                          isPremium
                            ? 'bg-emerald-400 text-stone-950'
                            : isPopular
                            ? 'bg-[#0F6E56] text-white'
                            : 'bg-stone-100 text-stone-700 border border-stone-300'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="mb-4">
                      <h3 className={`text-2xl font-black ${isPremium ? 'text-white' : 'text-stone-950'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${isPremium ? 'text-stone-400' : 'text-stone-600'}`}>
                        {plan.description}
                      </p>
                    </div>

                    <div className="py-4 border-y border-stone-200/50 my-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl font-black ${isPremium ? 'text-white' : 'text-stone-950'}`}>
                          {formatPrice(plan)}
                        </span>
                        <span className={`text-xs ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>
                          {formatCycleLabel(plan)}
                        </span>
                      </div>
                      {billingCycle === 'ANNUAL' && plan.monthlyPriceArs > 0 && (
                        <div className={`text-[11px] mt-1 font-bold ${isPremium ? 'text-emerald-400' : 'text-[#0F6E56]'}`}>
                          Equivale a ${Math.round((plan.annualPriceArs || plan.monthlyPriceArs * 10) / 12).toLocaleString('es-AR')}/mes
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                      <div className={`p-2.5 rounded-lg ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Alumnos</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxStudents.toLocaleString('es-AR')}</div>
                      </div>
                      <div className={`p-2.5 rounded-lg ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Aulas QR</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxCourses}</div>
                      </div>
                      <div className={`p-2.5 rounded-lg ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Docentes</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.maxUsers}</div>
                      </div>
                      <div className={`p-2.5 rounded-lg ${isPremium ? 'bg-stone-800' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>Almacenamiento</div>
                        <div className="font-extrabold text-sm mt-0.5">{plan.storageGb} GB</div>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className={`font-bold uppercase tracking-wider text-[10.5px] ${isPremium ? 'text-stone-400' : 'text-stone-500'}`}>
                        Lo que incluye:
                      </div>
                      {(plan.features?.bullets || []).map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className={`shrink-0 mt-0.5 ${isPremium ? 'text-emerald-400' : 'text-[#0F6E56] font-bold'}`}>
                            <Icon name="check" size={14} />
                          </span>
                          <span className={`leading-snug ${isPremium ? 'text-stone-300' : 'text-stone-800'}`}>
                            {bullet}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-stone-200/50">
                    <a
                      href={isPilot ? '/login' : '/login'}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                        isPremium
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-extrabold'
                          : isPopular
                          ? 'bg-[#0F6E56] hover:bg-[#0A4D3C] text-white'
                          : 'bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900'
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

          {/* Enterprise Callout */}
          <div className="mt-12 bg-white border border-stone-300 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold text-stone-950">
                ¿Gestionás una red escolar, congregación o distrito educativo?
              </h4>
              <p className="text-xs text-stone-600 max-w-2xl">
                Configuramos planes personalizados con cupos a medida, facturación especial por orden de compra, soporte técnico presencial y capacitaciones docentes.
              </p>
            </div>
            <a
              href="mailto:contacto@habitar.lat?subject=Consulta%20Plan%20Institucional%20Habitar"
              className="bg-stone-100 border border-stone-300 hover:border-[#0F6E56] px-5 py-2.5 rounded-xl text-xs font-bold text-stone-900 hover:text-[#0F6E56] transition-all shrink-0"
            >
              Contactar con un Asesor
            </a>
          </div>

        </div>
      </section>

      {/* Normativa PBA & Privacy Section */}
      <section id="privacidad" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3.5 py-1 rounded-full mb-3">
              <Icon name="shield" size={13} />
              <span>Seguridad Institucional & Soberanía de Datos</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Cumplimiento Normativo DGCyE PBA y Privacidad Escolar
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Habitar fue diseñado desde sus cimientos arquitectónicos para adaptarse a las exigencias jurídicas y pedagógicas de la <strong>Provincia de Buenos Aires</strong> (DGCyE / DIPREGEP), resguardando los derechos fundamentales de niñas, niños y adolescentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-stone-200/80 text-[#0F6E56] flex items-center justify-center font-bold">
                  <Icon name="school" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-stone-950">
                  Marco DGCyE & DIPREGEP
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Alineado a la <strong>Ley Provincial N° 13.688</strong> (Art. 16) y la <strong>Ley Nacional N° 26.061</strong>. Garantizamos el interés superior de la niñez, la preservación de la intimidad y la prohibición absoluta de explotación comercial o perfilamiento publicitario.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Jurisdicción PBA</span>
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-stone-200/80 text-[#0F6E56] flex items-center justify-center font-bold">
                  <Icon name="lock" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-stone-950">
                  Gobernanza B2B Escolar
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bajo la <strong>Ley 25.326</strong>, la Escuela es la exclusiva <em>Responsable del Tratamiento</em> de su matrícula. Habitar actúa estrictamente como <em>Encargado del Tratamiento</em>: no vendemos, no cedemos ni monetizamos ninguna información del alumnado.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Contrato B2B con Escuelas</span>
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-stone-200/80 text-[#0F6E56] flex items-center justify-center font-bold">
                  <Icon name="sparkles" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-stone-950">
                  IA Pedagógica Ética
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Las producciones y respuestas de los alumnos <strong>nunca son utilizadas para entrenar modelos de IA</strong> públicos ni comerciales. La evaluación es asistiva; la toma de decisiones pedagógicas y calificaciones permanece siempre en el criterio docente humano.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Supervisión Docente Obligatoria</span>
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 hover:border-[#0F6E56] transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-stone-200/80 text-[#0F6E56] flex items-center justify-center font-bold">
                  <Icon name="shield" size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-stone-950">
                  Derechos ARCO & Cifrado
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Cifrado de extremo a extremo en tránsito (TLS 1.3) y en reposo (AES-256). Ejercicio garantizado de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) ante solicitud formal de directivos o familias tutoras.
                </p>
              </div>
              <div className="pt-3 border-t border-stone-200 text-xs font-bold text-[#0F6E56] flex items-center gap-1">
                <Icon name="check" size={13} />
                <span>Auditoría & Supresión Permanente</span>
              </div>
            </div>

          </div>

          <div className="mt-12 bg-[#0F6E56] rounded-2xl p-7 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Documento Institucional Oficial
              </div>
              <h4 className="text-base sm:text-lg font-black text-white">
                Política Integral de Privacidad y Tratamiento de Datos Escolares
              </h4>
              <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                Consultá los 10 puntos de nuestro pliego legal completo: bases normativas PBA, roles contractuales, protocolos ante incidentes de ciberseguridad y vías de contacto del Oficial de Protección de Datos (DPO).
              </p>
            </div>
            <a
              href="/privacidad"
              className="bg-white hover:bg-emerald-50 text-stone-950 font-black px-5 py-3 rounded-xl text-xs transition-all shrink-0 shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <span>Leer Política Completa PBA</span>
              <Icon name="arrowRight" size={14} />
            </a>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#FAF8F5] border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F6E56] bg-emerald-100 px-3 py-1 rounded-full mb-3">
              <Icon name="helpCircle" size={13} />
              <span>Resolución de Dudas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              Todo lo que directores, docentes y coordinadores pedagógicos necesitan saber.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-stone-200 rounded-xl overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-stone-950 hover:text-[#0F6E56] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`transition-transform duration-200 text-stone-400 shrink-0 font-mono ${isOpen ? 'rotate-180 text-[#0F6E56]' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs sm:text-[13px] text-stone-600 leading-relaxed border-t border-stone-200 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-[#0A4D3C] text-white">
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
            <a
              href="#precios"
              className="w-full sm:w-auto bg-white text-stone-950 hover:bg-emerald-50 px-8 py-3.5 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Planes & Comenzar Piloto</span>
              <Icon name="arrowRight" size={14} />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ingresar a la Plataforma</span>
            </a>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0F6E56] text-white flex items-center justify-center p-1 shadow-2xs">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain filter invert brightness-200" />
                </div>
                <span className="text-base font-black text-stone-950">
                  Habitar<span className="text-[#0F6E56]">.</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-stone-500">
                Plataforma de evaluación y fortalecimiento de la comprensión lectora escolar mediante tres ejes cognitivos y aulas físicas QR.
              </p>
            </div>

            <div>
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[10px]">Plataforma</h5>
              <ul className="space-y-2 font-medium">
                <li><a href="/login" className="hover:text-[#0F6E56]">Acceso Docentes</a></li>
                <li><a href="/login" className="hover:text-[#0F6E56]">Portal Directivo</a></li>
                <li><a href="#aulas-qr" className="hover:text-[#0F6E56]">Aulas QR Permanente</a></li>
                <li><a href="#precios" className="hover:text-[#0F6E56]">Planes de Suscripción</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[10px]">Normativa & Legal</h5>
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
              <h5 className="font-black text-stone-950 mb-3 uppercase tracking-wider text-[10px]">Contacto Institucional</h5>
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
              <a href="/brand" className="hover:text-[#0F6E56]">Kit de Marca</a>
              <a href="/privacidad" className="hover:text-[#0F6E56] font-bold text-emerald-850">Privacidad PBA</a>
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


