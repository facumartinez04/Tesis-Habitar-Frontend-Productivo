import { Icon } from '../ui/Icon';
import { t, useI18n } from '../../../i18n';

export function PrivacyPolicyScreen() {
  useI18n();
  return (
    <div className="min-h-screen bg-white text-text-pri font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-text-pri">
              Habi<span className="text-emerald-700">tar</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs font-semibold text-text-sec hover:text-text-pri px-3 py-1.5 rounded-lg border border-gray-border hover:bg-surface transition-colors flex items-center gap-1.5"
            >
              <Icon name="arrowLeft" size={13} />
              <span>{t('Volver a la Landing')}</span>
            </a>
            <a
              href="/login"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              {t('Ingreso Seguro')}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3 text-center sm:text-left border-b border-gray-border pb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            <Icon name="shield" size={13} />
            {t('Marco Regulatorio & Compliance Institucional')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-pri tracking-tight leading-tight">
            {t('Política de Privacidad, Protección de Datos y Normativa Educativa PBA')}
          </h1>
          <p className="text-sm text-text-sec leading-relaxed">
            {t('Bases de tratamiento de datos personales de estudiantes y directivos conforme a la')}{' '}<strong>{t('Ley Nacional 25.326')}</strong>, <strong>{t('Ley 26.061')}</strong>{' '}{t('de Protección Integral de Niñas, Niños y Adolescentes, y el marco institucional de la')}{' '}<strong>{t('Dirección General de Cultura y Educación (DGCyE) de la Provincia de Buenos Aires (Ley 13.688)')}</strong>.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-text-sec pt-2">
            <span className="bg-surface border border-gray-border px-2.5 py-1 rounded-md font-medium">
              {t('Vigencia: Ciclo Lectivo 2026')}
            </span>
            <span className="bg-surface border border-gray-border px-2.5 py-1 rounded-md font-medium">
              {t('Jurisdicción: República Argentina & Pcia. de Buenos Aires')}
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
              {t('DGCyE / DIPREGEP Compliant')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="school" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('Roles Claros B2B')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              {t('La')}{' '}<strong>{t('Escuela')}</strong>{' '}{t('es la Responsable del Tratamiento de los datos de sus alumnos.')}{' '}<strong>Habitar</strong>{' '}{t('actúa exclusivamente como Encargado del Tratamiento.')}
            </p>
          </div>

          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="shield" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('Sin Fines Comerciales')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              <strong>{t('Cero publicidad')}</strong>{t(', cero venta de información y cero monetización de datos de menores. Los datos pertenecen a la comunidad escolar.')}
            </p>
          </div>

          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="sparkles" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('IA Segura y Supervisada')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              {t('La IA pedagógica no entrena modelos con datos de los alumnos. El docente supervisa y valida cada actividad antes de su publicación.')}
            </p>
          </div>

          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="building" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('Provincia de Buenos Aires')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              {t('Adecuación a las pautas de Entornos Digitales Seguros de la DGCyE y Ley de Educación Provincial 13.688 para gestión estatal y privada (DIPREGEP).')}
            </p>
          </div>

          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="download" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('Derechos ARCO Nativos')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              {t('Panel integrado para que directivos y familias ejerzan Acceso, Rectificación, Cancelación y Oposición en cualquier momento del ciclo escolar.')}
            </p>
          </div>

          <div className="bg-surface border border-gray-border rounded-xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Icon name="lock" size={16} />
            </div>
            <h3 className="text-xs font-bold text-text-pri">{t('Seguridad y Purga')}</h3>
            <p className="text-[11.5px] text-text-sec leading-relaxed">
              {t('Cifrado en reposo y en tránsito (TLS 1.3), auditoría inmutable de accesos y política configurable de retención y purga al finalizar el año.')}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-text-sec leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">1.</span>
              {t('Partes, Objeto y Modelo de Negocio')}
            </h2>
            <p>
              <strong>Habitar</strong>{' '}{t('opera como una plataforma tecnológica de software como servicio (SaaS) especializada en la evaluación y diagnóstico de la comprensión lectora en tres ejes cognitivos (Literal, Inferencial y Crítico) para instituciones educativas de nivel primario y secundario.')}
            </p>
            <p>
              {t('En el marco de la')}{' '}<strong>{t('Ley Nacional 25.326 de Protección de Datos Personales')}</strong>{t(', la')}{' '}<strong>{t('Institución Educativa contratante')}</strong>{' '}{t('(colegio, instituto o distrito escolar) reviste la calidad de')}{' '}<strong>{t('Responsable del Tratamiento')}</strong>{' '}{t('(Data Controller), conservando en todo momento la titularidad, gobierno y decisión sobre las bases de datos de sus alumnos y personal docente.')}{' '}<strong>Habitar</strong>{' '}{t('actúa exclusivamente en carácter de')}{' '}<strong>{t('Encargado del Tratamiento')}</strong>{' '}{t('(Data Processor), tratando la información conforme a las instrucciones directas de la institución escolar y con el único fin de proveer el servicio educativo contratado.')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">2.</span>
              {t('Marco Normativo de la Provincia de Buenos Aires (DGCyE & DIPREGEP)')}
            </h2>
            <p>
              {t('Para los establecimientos educativos situados en el territorio de la')}{' '}<strong>{t('Provincia de Buenos Aires')}</strong>{' '}{t('(tanto de gestión estatal como de gestión privada bajo la órbita de')}{' '}<strong>DIPREGEP</strong>{t('), Habitar ha diseñado su arquitectura respetando rigurosamente:')}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>{t('Ley de Educación Provincial N° 13.688:')}</strong>{' '}{t('en particular sus preceptos referidos a la protección de la intimidad, dignidad y derechos de los educandos (Art. 16 y concordantes), garantizando que las tecnologías digitales actúen como herramientas de inclusión pedagógica y no de segregación o etiquetamiento.')}
              </li>
              <li>
                <strong>{t('Pautas de Entornos Digitales Escolares Seguros de la DGCyE:')}</strong>{' '}{t('adopción del principio de')}{' '}<em>{t('interés superior del niño')}</em>{' '}{t('(en consonancia con la Ley Nacional 26.061 y la Convención sobre los Derechos del Niño), estableciendo salvaguardas técnicas para evitar la exposición indebida de identidad, imágenes o datos sensibles de menores.')}
              </li>
              <li>
                <strong>{t('Supervisión Docente Continua:')}</strong>{' '}{t('la normativa bonaerense prohíbe delegar en sistemas automatizados decisiones disciplinarias, de acreditación de saberes o de promoción escolar. En Habitar, la IA actúa como asistente en la formulación de ítems, siendo el docente el único responsable de validar, calificar y ponderar la trayectoria de sus alumnos.')}
              </li>
              <li>
                <strong>{t('Consentimiento Informado Escolar:')}</strong>{' '}{t('las escuelas de PBA cuentan a través de Habitar con un módulo de consentimiento institucional y modelos de notificación a tutores legales para formalizar la adhesión al entorno digital educativo.')}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">3.</span>
              {t('Categorías de Datos Tratados y Principio de Minimización')}
            </h2>
            <p>
              {t('Habitar aplica el principio estricto de')}{' '}<strong>{t('minimización de datos')}</strong>{t('. No solicitamos ni almacenamos datos sensibles, información biométrica, domicilios particulares, teléfonos de alumnos ni datos bancarios de las familias:')}
            </p>
            <div className="bg-surface rounded-xl p-4 border border-gray-border space-y-2">
              <div className="font-semibold text-text-pri text-xs uppercase tracking-wider">
                {t('Datos procesados por perfil:')}
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>{t('Alumnos:')}</strong>{' '}{t('Nombre, iniciales, curso/división escolar asignado, respuestas a actividades de lectura y métricas porcentuales calculadas en los ejes Literal, Inferencial y Crítico.')}</li>
                <li><strong>{t('Docentes y Directivos:')}</strong>{' '}{t('Nombre, correo electrónico institucional provisto por la escuela, rol asignado en la plataforma y registro de actividades creadas.')}</li>
                <li><strong>{t('Aulas Físicas:')}</strong>{' '}{t('Identificador de salón, curso, turno y código QR permanente.')}</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">4.</span>
              {t('Uso Ético de Inteligencia Artificial y Privacidad de Prompts')}
            </h2>
            <p>
              {t('Nuestro motor de IA pedagógica asiste al docente en el análisis de textos fuente y en la generación de preguntas de opción múltiple calibradas. Respecto al uso de IA:')}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>{t('Sin Reentrenamiento de Modelos Públicos:')}</strong>{' '}{t('Los textos cargados por los docentes y las respuestas de los estudiantes')}{' '}<strong>{t('nunca')}</strong>{' '}{t('se utilizan para entrenar, ajustar o alimentar modelos públicos de lenguaje (LLMs) de proveedores terceros ni de código abierto.')}
              </li>
              <li>
                <strong>{t('Prompts Desidentificados:')}</strong>{' '}{t('Las solicitudes enviadas al motor de IA contienen exclusivamente el fragmento de lectura literario o científico y las pautas pedagógicas de dificultad, sin contener jamás nombres, identificadores ni datos de ningún alumno.')}
              </li>
              <li>
                <strong>{t('Revisión Humana Requerida:')}</strong>{' '}{t('El docente tiene la potestad y el deber de revisar, editar o descartar cualquier pregunta generada antes de asignarla a su grupo de estudiantes.')}
              </li>
            </ul>
          </section>

          <section id="derechos-arco" className="space-y-3 scroll-mt-24">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">5.</span>
              {t('Ejercicio de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)')}
            </h2>
            <p>
              {t('Conforme a los artículos 14, 15 y 16 de la')}{' '}<strong>{t('Ley Nacional 25.326')}</strong>{t(', todo titular de datos (o sus representantes legales en caso de menores de edad) tiene derecho a conocer, corregir o suprimir la información que le concierna:')}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>{t('Derecho de Acceso y Portabilidad:')}</strong>{' '}{t('El equipo directivo de la institución puede exportar el legajo completo de desempeño y respuestas de cualquier alumno en formato estructurado (JSON/PDF) desde el módulo de cumplimiento institucional en un plazo no mayor a 10 días hábiles.')}
              </li>
              <li>
                <strong>{t('Derecho de Rectificación:')}</strong>{' '}{t('Los docentes y coordinadores pueden corregir nombres, cursos o asignaciones erróneas de forma inmediata desde el portal.')}
              </li>
              <li>
                <strong>{t('Derecho de Cancelación (Derecho al Olvido):')}</strong>{' '}{t('Ante la solicitud formal de los tutores o al desvincularse el alumno del establecimiento, la escuela puede ejecutar la supresión total de sus registros, quedando únicamente asentada la constancia inmutable en la bitácora de auditoría sin datos residuales.')}
              </li>
              <li>
                <strong>{t('Trazabilidad Obligatoria:')}</strong>{' '}{t('Cada exportación o eliminación genera un registro de auditoría con sello de tiempo, usuario que operó y acción ejecutada para garantizar transparencia ante inspecciones escolares de la DGCyE.')}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">6.</span>
              {t('Seguridad de la Información, Cifrado y Retención')}
            </h2>
            <p>
              {t('Habitar implementa medidas de seguridad técnicas y organizativas de estándar de industria:')}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>{t('Cifrado en Tránsito y Reposo:')}</strong>{' '}{t('Todo el tráfico viaja encriptado mediante protocolo HTTPS / TLS 1.3 con certificados SSL clase A. Las bases de datos se encuentran cifradas y aisladas lógicamente por institución (aislamiento multi-tenant).')}</li>
              <li><strong>{t('Control de Acceso Basado en Roles (RBAC):')}</strong>{' '}{t('Cada usuario accede exclusivamente a la información indispensable para su función pedagógica (los docentes solo visualizan sus cursos asignados; directores acceden a la visión macro).')}</li>
              <li><strong>{t('Purga al Cierre del Ciclo Lectivo:')}</strong>{' '}{t('Las escuelas pueden programar la purga periódica automática de respuestas antiguas (12, 24 o 36 meses), resguardando los principios de caducidad de datos escolares.')}</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-gray-border pt-6">
            <h2 className="text-lg font-bold text-text-pri flex items-center gap-2">
              <span className="text-emerald-700 font-mono">7.</span>
              {t('Canal Oficial de Consultas y Oficial de Cumplimiento')}
            </h2>
            <p>
              {t('Para requerimientos formales de inspección de la DGCyE, solicitudes de padres de familia o consultas institucionales sobre privacidad y procesamiento de datos:')}
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 space-y-1">
              <div className="font-bold text-xs">{t('Mesa de Cumplimiento y Privacidad Habitar')}</div>
              <div className="text-xs">{t('Correo Electrónico:')}{' '}<strong>{t('privacidad@habitar.lat')}</strong> / <strong>{t('contacto@habitar.lat')}</strong></div>
              <div className="text-[11px] text-emerald-800 mt-1">
                {t('Atención a instituciones educativas de la Provincia de Buenos Aires y resto del país.')}
              </div>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-border py-8 text-center text-xs text-text-sec bg-surface">
        <p>{t('© {getFullYear} Habitar — Plataforma de Comprensión Lectora con IA. Proyecto de Tesis de Grado.', { getFullYear: new Date().getFullYear() })}</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="/" className="hover:text-emerald-700">{t('Inicio')}</a>
          <a href="/consentimiento" className="hover:text-emerald-700">{t('Consentimiento Institucional')}</a>
          <a href="/status" className="hover:text-emerald-700">{t('Estado del Sistema')}</a>
          <a href="/login" className="hover:text-emerald-700">{t('Ingreso')}</a>
        </div>
      </footer>
    </div>
  );
}
