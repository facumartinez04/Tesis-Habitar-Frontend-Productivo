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
  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    try {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } catch {}
    setSession(sessionStore.get());
    listPublicPlans().then((data) => {
      if (data && data.length > 0) setPlans(data);
    });
  }, []);

  function fmtPrice(plan: SubscriptionPlan) {
    if (plan.monthlyPriceArs === 0) return 'Gratis';
    const price = billingCycle === 'ANNUAL'
      ? (plan.annualPriceArs || plan.monthlyPriceArs * 10)
      : plan.monthlyPriceArs;
    return `$${price.toLocaleString('es-AR')}`;
  }

  function fmtCycle(plan: SubscriptionPlan) {
    if (plan.monthlyPriceArs === 0) return 'durante 60 dias';
    return billingCycle === 'ANNUAL' ? '/ ano' : '/ mes';
  }

  const axes = {
    literal: {
      badge: 'Eje 1 - Nivel Explicito',
      title: 'Eje Literal',
      subtitle: 'Recuperacion explicita de informacion',
      description: 'Evalua la capacidad de ubicar hechos, personajes, cronologia y datos textuales tal como fueron formulados en la lectura.',
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      question: 'Segun el texto sobre biodiversidad, cual es la causa principal de la ruptura en cadena de los ecosistemas?',
      options: [
        'El aumento estacional de las lluvias en zonas boscosas.',
        'La desaparicion de una especie que altera las interdependencias ecologicas.',
        'La rotacion de cultivos en areas agricolas protegidas.',
        'El ciclo migratorio natural de las aves rapaces.',
      ],
      correctIndex: 1,
      benefit: 'Fortalece la lectura atenta, la extraccion de datos concretos y la memoria de trabajo.',
      feedback: 'En el nivel literal, el alumno identifica directamente el dato explicito formulado en el texto.',
    },
    inferencial: {
      badge: 'Eje 2 - Nivel Comprensivo',
      title: 'Eje Inferencial',
      subtitle: 'Lectura entre lineas y deduccion contextual',
      description: 'Desafia al estudiante a deducir intenciones, relaciones causales no explicitas y significado de vocabulario por contexto.',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      question: 'Que se puede inferir respecto a la relacion entre la biodiversidad y la economia descrita por el autor?',
      options: [
        'La conservacion ecologica solo genera gastos innecesarios para el Estado.',
        'Los servicios ecosistemicos sustentan indirectamente actividades productivas humanas.',
        'Solo los paises industrializados pueden permitirse cuidar sus recursos naturales.',
        'Las economias modernas son totalmente independientes del medio ambiente.',
      ],
      correctIndex: 1,
      benefit: 'Desarrolla el razonamiento inductivo/deductivo y la integracion profunda de ideas.',
      feedback: 'En el nivel inferencial, el alumno conecta premisas dispersas para llegar a conclusiones no explicitas.',
    },
    critico: {
      badge: 'Eje 3 - Nivel Reflexivo',
      title: 'Eje Critico',
      subtitle: 'Juicio fundamentado y pensamiento reflexivo',
      description: 'Estimula la argumentacion, la identificacion de sesgos, la contrastacion de perspectivas y la postura etica del alumno.',
      color: '#E11D48',
      bg: '#FFF1F2',
      border: '#FECDD3',
      question: 'A partir de la tesis del texto, cual de los siguientes argumentos fundamenta mejor una politica de proteccion ambiental comunitaria?',
      options: [
        'Porque la preservacion ecologica es una responsabilidad compartida de impacto etico y generacional.',
        'Porque impone sanciones monetarias a las comunidades vecinas.',
        'Porque evita que otras regiones utilicen los recursos hidricos.',
        'Porque garantiza que los precios de los productos no sufran variaciones.',
      ],
      correctIndex: 0,
      benefit: 'Fomenta el pensamiento critico, la toma de postura reflexiva y la fundamentacion de ideas.',
      feedback: 'En el nivel critico, el alumno evalua argumentos, valores eticos y toma una postura justificada.',
    },
  };

  function handleAnswer(idx: number) {
    setSelectedDemoAnswer(idx);
    setDemoFeedback(idx === axes[activeAxisTab].correctIndex);
  }

  function switchAxis(tab: 'literal' | 'inferencial' | 'critico') {
    setActiveAxisTab(tab);
    setSelectedDemoAnswer(null);
    setDemoFeedback(null);
  }

  const faqs = [
    {
      q: 'Como funciona el codigo QR permanente del aula fisica?',
      a: 'Cada aula creada en Habitar tiene un codigo QR unico e inmutable (por ejemplo: AULA-6A-8A4F). El colegio lo imprime una sola vez y lo coloca en la puerta o pared del salon. La docente abre la app desde su celular o laptop, escanea el QR en segundos y el sistema la conecta automaticamente a ese espacio para cargar lecturas y vincular actividades.',
    },
    {
      q: 'Que sucede si no hay buena conexion a internet en la escuela?',
      a: 'Habitar esta disenada como Progressive Web App (PWA) con Service Worker integrado. Los textos de lectura y cuestionarios precargados pueden utilizarse sin interrupciones incluso ante cortes temporales de red, sincronizando los resultados una vez recuperada la conexion.',
    },
    {
      q: 'Como genera la IA las preguntas en los tres ejes cognitivos?',
      a: 'El docente puede pegar un texto, subir un archivo (.txt / .md) o importar desde Google Drive. Nuestro motor de IA pedagogica analiza la estructura del texto y formula preguntas calibradas para los tres ejes: Literal, Inferencial y Critico. El docente tiene control total: puede editar, agregar o ajustar cualquier pregunta antes de publicarla.',
    },
    {
      q: 'Como protege Habitar los datos de los estudiantes (Normativa ARCO)?',
      a: 'La privacidad es nuestro pilar fundamental. Cumplimos con la Ley de Proteccion de Datos Personales, contamos con modulo de consentimiento informado para tutores legales y herramientas nativas para el ejercicio de los derechos ARCO (Acceso, Rectificacion, Cancelacion y Oposicion), con trazabilidad y cifrado.',
    },
    {
      q: 'Cuanto dura el Piloto Gratuito y que incluye?',
      a: 'El Piloto Gratuito tiene una vigencia de 60 dias completos para tu institucion. Incluye hasta 15 docentes, 150 alumnos, 8 aulas fisicas con QR permanente, alertas tempranas y exportacion de reportes, sin costo ni compromiso.',
    },
    {
      q: 'Se pueden personalizar los cupos y modulos para nuestra institucion?',
      a: 'Si! Desde el panel de administracion de Habitar podemos adaptar planes a medida para colegios de gran tamano, federaciones o distritos escolares, ajustando cupos de alumnos, almacenamiento, dominio propio de marca blanca e integracion con sistemas de gestion escolar.',
    },
  ];

  const ax = axes[activeAxisTab];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950">

      {/* ───── NAVBAR ───── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#0F6E56] flex items-center justify-center p-1.5">
              <img src="/logo.svg" alt="" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              Habi<span className="text-[#0F6E56]">tar</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium text-gray-600">
            <a href="#demo" className="px-3 py-2 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors">Demo</a>
            <a href="#ejes" className="px-3 py-2 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors">Ejes Cognitivos</a>
            <a href="#aulas-qr" className="px-3 py-2 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors">Aulas QR</a>
            <a href="#precios" className="px-3 py-2 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors">Precios</a>
            <a href="#privacidad" className="px-3 py-2 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors">Privacidad</a>
          </nav>

          <div className="hidden sm:flex items-center gap-2">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0F6E56] text-white flex items-center justify-center text-xs font-bold">
                    {session.user.initials || session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <Icon name="chevronDown" size={14} className={`text-gray-400 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
                </button>

                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                      <div className="px-3.5 py-2.5 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</div>
                        <div className="text-xs text-gray-400 truncate">{session.user.email}</div>
                      </div>
                      <a
                        href={dashboardPathForRole(session.user.role)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenu(false)}
                      >
                        <Icon name="layers" size={15} className="text-gray-400" />
                        Mi Panel
                      </a>
                      <button
                        onClick={() => { clearSession(); setSession(null); setUserMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Icon name="logOut" size={15} />
                        Cerrar Sesion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                    window.location.href = '/actividad';
                  }}
                  className="text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Soy Alumno
                </button>
                <a href="/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Iniciar Sesion
                </a>
                <a
                  href="#precios"
                  className="text-[13px] font-semibold text-white bg-[#0F6E56] hover:bg-[#0A4D3C] px-4 py-2 rounded-lg transition-colors"
                >
                  Comenzar Gratis
                </a>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
            aria-label="Menu"
          >
            <Icon name={mobileMenu ? 'close' : 'menu'} size={22} />
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
            <a href="#demo" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Demo en Vivo</a>
            <a href="#ejes" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">3 Ejes Cognitivos</a>
            <a href="#aulas-qr" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Aulas QR</a>
            <a href="#precios" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Precios</a>
            <a href="#privacidad" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Privacidad</a>
            <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem('habitar_user_role', 'alumno'); } catch {}
                  setMobileMenu(false);
                  window.location.href = '/actividad';
                }}
                className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg cursor-pointer"
              >
                Soy Alumno
              </button>
              <a href="/login" className="block w-full text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">
                Iniciar Sesion
              </a>
              <a href="#precios" onClick={() => setMobileMenu(false)} className="block w-full text-center py-2.5 bg-[#0F6E56] text-white rounded-lg text-sm font-semibold">
                Comenzar Gratis
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ───── HERO ───── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 via-white to-white" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#0F6E56] border border-emerald-200 text-xs font-semibold px-3.5 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Piloto gratuito de 60 dias sin tarjeta de credito
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-gray-950 leading-[1.1]">
              Comprension lectora con{' '}
              <span className="text-[#0F6E56]">diagnostico en tiempo real</span>{' '}
              para cada aula
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-normal">
              Diagnosticos en tres ejes cognitivos, codigos QR permanentes en el aula fisica y analitica formativa para docentes y directivos de escuelas primarias y secundarias.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="#precios"
                className="w-full sm:w-auto bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Comenzar Piloto Gratuito
                <Icon name="arrowRight" size={16} />
              </a>
              <a
                href="#demo"
                className="w-full sm:w-auto text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Ver Demo Interactiva
              </a>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200 rounded-2xl overflow-hidden max-w-2xl mx-auto">
            {[
              { value: '3 Ejes', label: 'Literal, Inferencial y Critico' },
              { value: 'QR Fijo', label: 'Un cartel por aula, para siempre' },
              { value: 'ARCO', label: 'Cumplimiento normativo PBA' },
            ].map((s) => (
              <div key={s.value} className="bg-white px-6 py-5 text-center">
                <div className="text-xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── DEMO INTERACTIVA ───── */}
      <section id="demo" className="py-20 sm:py-24 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Simulador en vivo</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Experimenta la evaluacion en tres ejes
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base">
              Selecciona un eje, lee el fragmento y hace clic en una opcion para ver la retroalimentacion instantanea.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Axis tabs */}
            <div className="flex border-b border-gray-200">
              {(['literal', 'inferencial', 'critico'] as const).map((tab) => {
                const active = activeAxisTab === tab;
                const labels = { literal: 'Literal', inferencial: 'Inferencial', critico: 'Critico' };
                const colors = { literal: '#059669', inferencial: '#D97706', critico: '#E11D48' };
                return (
                  <button
                    key={tab}
                    onClick={() => switchAxis(tab)}
                    className="flex-1 py-3.5 text-sm font-semibold transition-colors relative cursor-pointer"
                    style={{ color: active ? colors[tab] : '#6B7280' }}
                  >
                    {labels[tab]}
                    {active && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: colors[tab] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5 sm:p-8 space-y-6">
              {/* Reading passage */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="fileText" size={14} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Texto de lectura: "Biodiversidad y Ecosistemas" - 6to Grado</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  "La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre si para regular el clima, mantener los suelos fertiles y proveer agua limpia. La perdida de una sola especie vegetal o animal genera efectos en cadena que impactan en la produccion de alimentos y en la salud humana."
                </p>
              </div>

              {/* Axis info */}
              <div>
                <span
                  className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md mb-3"
                  style={{ backgroundColor: ax.bg, color: ax.color, border: `1px solid ${ax.border}` }}
                >
                  {ax.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  {ax.question}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ax.options.map((opt, idx) => {
                  const selected = selectedDemoAnswer === idx;
                  const correct = idx === ax.correctIndex;
                  let cls = 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50';
                  if (selected && correct) cls = 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-200';
                  if (selected && !correct) cls = 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-200';
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`p-4 rounded-xl text-left text-sm border transition-all cursor-pointer flex items-start justify-between gap-2 ${cls}`}
                    >
                      <span className="leading-snug">{String.fromCharCode(65 + idx)}) {opt}</span>
                      {selected && <span className="shrink-0 text-sm">{correct ? '✓' : '✗'}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {selectedDemoAnswer !== null && (
                <div
                  className="p-4 rounded-xl text-sm border"
                  style={{
                    backgroundColor: demoFeedback ? '#ECFDF5' : '#FFFBEB',
                    borderColor: demoFeedback ? '#A7F3D0' : '#FDE68A',
                    color: demoFeedback ? '#065F46' : '#92400E',
                  }}
                >
                  <span className="font-semibold">{demoFeedback ? 'Respuesta correcta' : 'Incorrecto'}: </span>
                  {ax.feedback}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───── 3 EJES COGNITIVOS ───── */}
      <section id="ejes" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Marco pedagogico</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Los tres ejes de la comprension lectora
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
              Cada evaluacion se estructura en tres dimensiones cognitivas complementarias para un diagnostico preciso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              {
                num: '1', title: 'Eje Literal', sub: 'Nivel Explicito', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                desc: 'Evalua la capacidad de ubicar hechos, personajes, cronologia y datos textuales tal como fueron formulados.',
                benefit: 'Fortalece la lectura atenta y la extraccion de datos concretos.',
              },
              {
                num: '2', title: 'Eje Inferencial', sub: 'Nivel Comprensivo', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
                desc: 'Desafia a deducir intenciones, relaciones causales no explicitas y significado de vocabulario por contexto.',
                benefit: 'Desarrolla el razonamiento inductivo/deductivo y la integracion de ideas.',
              },
              {
                num: '3', title: 'Eje Critico', sub: 'Nivel Reflexivo', color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3',
                desc: 'Estimula la argumentacion, la identificacion de sesgos y la contrastacion de perspectivas.',
                benefit: 'Fomenta el pensamiento critico y la toma de postura reflexiva.',
              },
            ] as const).map((axis) => (
              <div key={axis.num} className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-md transition-all flex flex-col">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm mb-5"
                  style={{ backgroundColor: axis.color }}
                >
                  {axis.num}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: axis.color }}>
                  {axis.sub}
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{axis.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-auto">{axis.desc}</p>
                <div
                  className="mt-5 p-3 rounded-lg text-xs font-medium border"
                  style={{ backgroundColor: axis.bg, borderColor: axis.border, color: axis.color }}
                >
                  {axis.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── AULAS QR ───── */}
      <section id="aulas-qr" className="py-20 sm:py-24 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56]">Innovacion en el aula</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950 leading-tight">
                Codigos QR permanentes en cada salon
              </h2>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                Se imprime una sola vez, se pega en la pared y funciona para siempre. Sin proyectores, sin enlaces largos, sin generar codigos nuevos cada semana.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { step: '1', title: 'Crea el aula', desc: 'Materia, salon fisico, grado, division y turno.', color: '#0F6E56' },
                  { step: '2', title: 'Imprimí el cartel QR', desc: 'Poster A4 listo para pegar en la pared del salon.', color: '#D97706' },
                  { step: '3', title: 'Escaneá y empezá', desc: 'La docente escanea el QR y sube el texto de lectura.', color: '#3B82F6' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{s.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Poster mockup */}
            <div className="flex justify-center">
              <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Cartel Oficial de Aula
                </span>
                <div>
                  <div className="text-lg font-extrabold text-gray-900">AULA 6to A - Salon 12</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5">Turno Manana</div>
                </div>
                <div className="w-40 h-40 mx-auto bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <Icon name="qrCode" size={96} className="text-gray-800" />
                  <span className="font-mono text-[11px] font-bold text-gray-600 mt-1.5 tracking-wider">AULA-6A-8A4F</span>
                </div>
                <p className="text-xs text-gray-400 font-medium">
                  Escanear con la app docente de Habitar
                </p>
                <div className="pt-3 border-t border-gray-100 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Icon name="printer" size={14} className="text-[#0F6E56]" />
                    Listo para imprimir en A4
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ANALITICA ───── */}
      <section id="analitica" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Para directivos</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Vision integral del rendimiento escolar
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
              Detecta a tiempo a los estudiantes que necesitan apoyo y toma decisiones pedagogicas respaldadas por evidencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: 'alertTriangle' as const,
                title: 'Alertas Tempranas',
                desc: 'Algoritmos que detectan caidas en comprension inferencial o critica antes de las instancias de cierre.',
                color: '#D97706', bg: '#FFFBEB',
              },
              {
                icon: 'activity' as const,
                title: 'Comparador de Periodos',
                desc: 'Contrasta el rendimiento entre Periodo A y B con deltas porcentuales en cada eje cognitivo.',
                color: '#059669', bg: '#ECFDF5',
              },
              {
                icon: 'download' as const,
                title: 'Exportacion Institucional',
                desc: 'Reportes completos en Excel o PDF con un solo clic para inspectores y supervisores.',
                color: '#3B82F6', bg: '#EFF6FF',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-md transition-all">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: f.bg, color: f.color }}
                >
                  <Icon name={f.icon} size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── PRECIOS ───── */}
      <section id="precios" className="py-20 sm:py-24 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Precios</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Planes de suscripcion institucional
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
              Comenza con un piloto gratuito de 60 dias o elegi el plan que mejor se adapte a tu escuela.
            </p>

            <div className="mt-8 inline-flex items-center p-1 bg-gray-200/60 rounded-lg">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  billingCycle === 'MONTHLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'ANNUAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Anual
                <span className="text-[10px] font-semibold text-[#0F6E56] bg-emerald-50 px-1.5 py-0.5 rounded">-17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => {
              const popular = plan.id === 'estandar';
              const premium = plan.id === 'premium';
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl p-6 sm:p-7 flex flex-col transition-all ${
                    popular
                      ? 'border-2 border-[#0F6E56] shadow-lg ring-1 ring-emerald-100'
                      : 'border border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-3 left-6 text-[11px] font-semibold px-3 py-1 rounded-full ${
                      popular
                        ? 'bg-[#0F6E56] text-white'
                        : premium
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.badge}
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-gray-900 mt-2">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-gray-900">{fmtPrice(plan)}</span>
                    <span className="text-sm text-gray-400 ml-1.5">{fmtCycle(plan)}</span>
                    {billingCycle === 'ANNUAL' && plan.monthlyPriceArs > 0 && (
                      <div className="text-xs text-[#0F6E56] font-medium mt-1">
                        ${Math.round((plan.annualPriceArs || plan.monthlyPriceArs * 10) / 12).toLocaleString('es-AR')}/mes
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
                    {[
                      { label: 'Alumnos', val: plan.maxStudents.toLocaleString('es-AR') },
                      { label: 'Aulas QR', val: String(plan.maxCourses) },
                      { label: 'Docentes', val: String(plan.maxUsers) },
                      { label: 'Storage', val: `${plan.storageGb} GB` },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="text-[10px] text-gray-400 font-medium uppercase">{m.label}</div>
                        <div className="font-bold text-gray-900 mt-0.5">{m.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5 mb-6 flex-1">
                    {(plan.features?.bullets || []).map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Icon name="check" size={14} className="text-[#0F6E56] mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-600 leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="/login"
                    className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-colors cursor-pointer block ${
                      popular
                        ? 'bg-[#0F6E56] hover:bg-[#0A4D3C] text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200'
                    }`}
                  >
                    {plan.monthlyPriceArs === 0 ? 'Iniciar Piloto Gratuito' : `Elegir ${plan.name}`}
                  </a>
                </div>
              );
            })}
          </div>

          {/* Enterprise */}
          <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h4 className="text-base font-bold text-gray-900">Red escolar o distrito educativo?</h4>
              <p className="text-sm text-gray-500 mt-1 max-w-lg">
                Planes personalizados con cupos a medida, facturacion por orden de compra, soporte presencial y capacitaciones.
              </p>
            </div>
            <a
              href="mailto:contacto@habitar.lat?subject=Consulta%20Plan%20Institucional%20Habitar"
              className="shrink-0 bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Contactar Asesor
            </a>
          </div>
        </div>
      </section>

      {/* ───── PRIVACIDAD ───── */}
      <section id="privacidad" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Seguridad y cumplimiento</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Cumplimiento normativo y privacidad escolar
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
              Disenado desde sus cimientos para las exigencias juridicas de la Provincia de Buenos Aires.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: 'school' as const, title: 'Marco DGCyE', color: '#0F6E56', bg: '#ECFDF5',
                desc: 'Alineado a la Ley Provincial 13.688 y la Ley Nacional 26.061. Interes superior de la ninez.',
                tag: 'Jurisdiccion PBA',
              },
              {
                icon: 'lock' as const, title: 'Gobernanza B2B', color: '#D97706', bg: '#FFFBEB',
                desc: 'La Escuela es la exclusiva Responsable del Tratamiento. Habitar no vende ni cede datos.',
                tag: 'Contrato B2B',
              },
              {
                icon: 'sparkles' as const, title: 'IA Etica', color: '#7C3AED', bg: '#F5F3FF',
                desc: 'Las respuestas de alumnos nunca entrenan modelos comerciales. Supervision docente obligatoria.',
                tag: 'Sin perfilamiento',
              },
              {
                icon: 'shield' as const, title: 'ARCO y Cifrado', color: '#3B82F6', bg: '#EFF6FF',
                desc: 'TLS 1.3 en transito, AES-256 en reposo. Derechos ARCO garantizados ante solicitud formal.',
                tag: 'Auditoria completa',
              },
            ].map((c) => (
              <div key={c.title} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all flex flex-col">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: c.bg, color: c.color }}
                >
                  <Icon name={c.icon} size={18} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{c.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-auto">{c.desc}</p>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-medium text-[#0F6E56] flex items-center gap-1">
                    <Icon name="check" size={12} />
                    {c.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-[#0F6E56] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h4 className="text-base font-bold text-white">Politica Integral de Privacidad</h4>
              <p className="text-sm text-emerald-200 mt-1 max-w-lg">
                Bases normativas PBA, roles contractuales, protocolos ante incidentes y contacto del DPO.
              </p>
            </div>
            <a
              href="/privacidad"
              className="shrink-0 bg-white hover:bg-emerald-50 text-gray-900 px-5 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              Leer Politica Completa
              <Icon name="arrowRight" size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="py-20 sm:py-24 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F6E56] mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">
              Todo lo que necesitas saber
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 text-sm font-semibold text-gray-900 hover:text-[#0F6E56] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <Icon
                      name={open ? 'minus' : 'plus'}
                      size={16}
                      className={`shrink-0 transition-colors ${open ? 'text-[#0F6E56]' : 'text-gray-400'}`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="py-20 sm:py-24 bg-[#0F6E56]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Suma tu escuela a la nueva era de la comprension lectora
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Inicia hoy tu prueba piloto gratuita de 60 dias y descubri como el diagnostico en tres ejes transforma los resultados.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="#precios"
              className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-gray-900 px-7 py-3.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Ver Planes y Comenzar
              <Icon name="arrowRight" size={16} />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto text-white border border-white/25 hover:bg-white/10 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center cursor-pointer"
            >
              Ingresar a la Plataforma
            </a>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0F6E56] flex items-center justify-center p-1.5">
                  <img src="/logo.svg" alt="" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <span className="text-base font-extrabold text-gray-900">
                  Habi<span className="text-[#0F6E56]">tar</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Evaluacion y fortalecimiento de la comprension lectora escolar.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Plataforma</h5>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="/login" className="hover:text-[#0F6E56] transition-colors">Acceso Docentes</a></li>
                <li><a href="/login" className="hover:text-[#0F6E56] transition-colors">Portal Directivo</a></li>
                <li><a href="#aulas-qr" className="hover:text-[#0F6E56] transition-colors">Aulas QR</a></li>
                <li><a href="#precios" className="hover:text-[#0F6E56] transition-colors">Precios</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Legal</h5>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="/privacidad" className="hover:text-[#0F6E56] transition-colors">Politica de Privacidad</a></li>
                <li><a href="/consentimiento" className="hover:text-[#0F6E56] transition-colors">Consentimiento Menores</a></li>
                <li><a href="/brand" className="hover:text-[#0F6E56] transition-colors">Kit de Marca</a></li>
                <li><a href="/status" className="hover:text-[#0F6E56] transition-colors">Estado del Sistema</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Contacto</h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                Soporte para instituciones educativas de Argentina y Latinoamerica.
              </p>
              <a href="mailto:contacto@habitar.lat" className="text-xs font-medium text-[#0F6E56] mt-2 block">
                contacto@habitar.lat
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <span>{new Date().getFullYear()} Habitar - Todos los derechos reservados. Proyecto de Tesis de Grado.</span>
            <div className="flex gap-4 font-medium">
              <a href="/privacidad" className="hover:text-[#0F6E56] transition-colors">Privacidad</a>
              <a href="/consentimiento" className="hover:text-[#0F6E56] transition-colors">Consentimiento</a>
              <a href="/status" className="hover:text-[#0F6E56] transition-colors">Estado</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
