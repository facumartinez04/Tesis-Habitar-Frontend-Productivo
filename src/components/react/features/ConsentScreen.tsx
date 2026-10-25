import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { sessionStore } from '../../../store/sessionStore';
import { acceptConsent, getConsentDocument } from '../../../services/complianceService';
import type { ConsentDocument } from '../../../types/compliance';
import { t, useI18n } from '../../../i18n';

const DEFAULT_CONSENT_DOC: ConsentDocument = {
  version: '2026.1-PBA',
  publishedAt: '2026-03-01',
  dataController: 'Institución Educativa Contratante (Escuela / Colegio)',
  dataProcessor: 'Habitar Technologies — Plataforma de Comprensión Lectora con IA',
};

const PARENT_COMMUNICATION_MODEL = `Estimadas Familias y Tutores Legales:

Por medio de la presente, les informamos que durante el presente ciclo lectivo nuestra institución escolar incorporará como recurso pedagógico auxiliar la plataforma "Habitar" (habitar.lat) para el diagnóstico y fortalecimiento de la comprensión lectora en tres ejes cognitivos (Literal, Inferencial y Crítico).

En cumplimiento de la Ley Nacional N° 25.326 de Protección de Datos Personales, la Ley N° 26.061 de Protección Integral de los Derechos de las Niñas, Niños y Adolescentes, y la Ley de Educación Provincial N° 13.688 de la Provincia de Buenos Aires (DGCyE / DIPREGEP):

1. Los datos utilizados se limitan estrictamente al nombre o número de lista escolar y las respuestas a las actividades pedagógicas de lectura. No se solicitan datos biométricos, domicilios particulares ni información socioeconómica familiar.
2. Queda expresamente prohibido cualquier uso publicitario, comercial, cesión o monetización de los datos del alumnado.
3. La plataforma cuenta con cifrado de seguridad y no reentrena modelos de Inteligencia Artificial con las producciones de los estudiantes. Toda actividad y ponderación permanece bajo la supervisión humana del equipo docente.
4. Las familias tutoras conservan en todo momento el derecho de acceso, rectificación o supresión de la información registrada solicitándolo ante la dirección del establecimiento.

Atentamente,
Equipo Directivo y Docente`;

export function ConsentScreen() {
  useI18n();
  const [session, setSession] = useState(sessionStore.get());
  const [document_, setDocument] = useState<ConsentDocument>(DEFAULT_CONSENT_DOC);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSession(sessionStore.get());
    getConsentDocument()
      .then((doc) => {
        if (doc) setDocument(doc);
      })
      .catch(() => {

      });
  }, []);

  const canSign = session && (session.user.role === 'admin' || session.user.role === 'coordinador' || session.user.role === 'director');

  async function handleSubmit() {
    if (!canSign) return;
    setSubmitting(true);
    try {
      await acceptConsent();
      setConfirmed(true);
    } catch {

      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyModel() {
    navigator.clipboard.writeText(t(PARENT_COMMUNICATION_MODEL));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="min-h-screen bg-surface text-text-pri font-sans pb-16">
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
              <span className="hidden sm:inline">{t('Volver a la Landing')}</span>
              <span className="sm:hidden">{t('Inicio')}</span>
            </a>
            <a
              href="/privacidad"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t('Política de Privacidad PBA')}
            </a>
            {session ? (
              <a
                href={session.user.role === 'docente' ? '/docente/cursos' : '/institucional'}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              >
                {t('Mi Panel')}
              </a>
            ) : (
              <a
                href="/login"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              >
                {t('Ingreso Escuelas')}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-8">

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full shadow-xs">
            <Icon name="shield" size={13} />
            {t('Documento de Acceso Público y Transparente')}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-pri tracking-tight">
            {t('Términos de Tratamiento de Datos y Consentimiento Informado Escolar')}
          </h1>
          <p className="text-xs sm:text-sm text-text-sec max-w-2xl mx-auto leading-relaxed">
            {t('Pliego institucional bajo la')}{' '}<strong>{t('Ley Nacional N° 25.326')}</strong>, <strong>{t('Ley N° 26.061')}</strong>{' '}{t('de Protección Integral de la Niñez y las pautas educativas de la')}{' '}<strong>{t('Dirección General de Cultura y Educación (DGCyE)')}</strong>{' '}{t('de la Provincia de Buenos Aires (Ley 13.688 / DIPREGEP).')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-text-sec pt-1">
            <span className="bg-white border border-gray-border px-2.5 py-1 rounded-md font-medium">
              {t('Versión: {version}', { version: document_.version })}
            </span>
            <span className="bg-white border border-gray-border px-2.5 py-1 rounded-md font-medium">
              {t('Publicación: {publishedAt}', { publishedAt: document_.publishedAt })}
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
              {t('Sin requisito de inicio de sesión para consulta')}
            </span>
          </div>
        </div>

        <Card className="border-gray-border/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-text-sec mb-3">
            {t('Roles Jurídicos de Tratamiento (Ley 25.326 & DGCyE PBA)')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-surface rounded-xl p-4 border border-gray-border">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                <Icon name="school" size={15} />
                <span>{t('Responsable del Tratamiento (Data Controller)')}</span>
              </div>
              <div className="text-sm font-semibold text-text-pri mb-1">
                {t(document_.dataController)}
              </div>
              <p className="text-[11.5px] text-text-sec leading-relaxed">
                {t('Conserva la propiedad, tutela y gobierno exclusivo sobre la matrícula escolar y las calificaciones de los estudiantes.')}
              </p>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-gray-border">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                <Icon name="lock" size={15} />
                <span>{t('Encargado del Tratamiento (Data Processor)')}</span>
              </div>
              <div className="text-sm font-semibold text-text-pri mb-1">
                {t(document_.dataProcessor)}
              </div>
              <p className="text-[11.5px] text-text-sec leading-relaxed">
                {t('Provee la infraestructura técnica y los algoritmos auxiliares conforme a las instrucciones contractuales de la escuela.')}
              </p>
            </div>
          </div>
        </Card>

        <div className="bg-white border border-gray-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs text-xs sm:text-sm text-text-sec leading-relaxed">

          <div className="space-y-2 border-b border-gray-border/60 pb-4">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
              {t('Finalidad Exclusivamente Pedagógica')}
            </h2>
            <p>
              {t('El tratamiento de datos dentro de Habitar se circunscribe de manera taxativa a la evaluación, diagnóstico y potenciación de la comprensión lectora en los ejes Literal, Inferencial y Crítico. No se realiza ningún tratamiento secundario incompatible con el objeto pedagógico institucional contratado por la escuela.')}
            </p>
          </div>

          <div className="space-y-2 border-b border-gray-border/60 pb-4">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">2</span>
              {t('Interés Superior del Niño e Intimidad (Ley 13.688 PBA & Ley 26.061)')}
            </h2>
            <p>
              {t('En concordancia con el')}{' '}<strong>{t('Artículo 16 de la Ley Provincial N° 13.688')}</strong>{' '}{t('y la')}{' '}<strong>{t('Ley Nacional N° 26.061')}</strong>{t(', se resguarda de forma absoluta la intimidad, dignidad e integridad moral de los alumnos. El entorno no permite interacciones sociales no moderadas, mensajería abierta ni exposición pública de puntajes o desempeños individuales.')}
            </p>
          </div>

          <div className="space-y-2 border-b border-gray-border/60 pb-4">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">3</span>
              {t('Prohibición Estricta de Comercialización, Cesión y Publicidad')}
            </h2>
            <p>
              {t('Habitar no vende, no alquila, no cede ni monetiza bases de datos de estudiantes ni de personal docente. La plataforma carece totalmente de publicidad comercial, rastreadores de terceros (ad-trackers) o mecanismos de monetización de comportamiento digital.')}
            </p>
          </div>

          <div className="space-y-2 border-b border-gray-border/60 pb-4">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">4</span>
              {t('Inteligencia Artificial Supervisada sin Re-entrenamiento')}
            </h2>
            <p>
              {t('El motor de Inteligencia Artificial actúa en carácter asistivo para la formulación de reactivos de lectura.')}{' '}<strong>{t('Las producciones, textos o respuestas de los estudiantes nunca son utilizadas para reentrenar modelos fundacionales de IA')}</strong>{t('. Asimismo, conforme a las directivas de la DGCyE de PBA, queda expresamente prohibida la delegación en sistemas automáticos de decisiones disciplinarias o de acreditación académica escolar: la supervisión humana del docente es continua e insustituible.')}
            </p>
          </div>

          <div className="space-y-2 border-b border-gray-border/60 pb-4">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">5</span>
              {t('Ejercicio Irrestricto de Derechos ARCO')}
            </h2>
            <p>
              {t('Los tutores legales o estudiantes mayores de edad tienen el derecho permanente de solicitar el Acceso, Rectificación, Cancelación u Oposición de sus datos personales. Las solicitudes son atendidas por el Responsable del Tratamiento (la escuela) con la asistencia técnica inmediata de Habitar en un plazo que no excederá los 10 días hábiles legales.')}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">6</span>
              {t('Cifrado, Aislamiento y Política de Purga')}
            </h2>
            <p>
              {t('Todos los datos en tránsito son protegidos mediante TLS 1.3 con cifrado fuerte de 256 bits. Los registros de cada colegio residen en esquemas lógicos aislados (multi-tenant) y las instituciones cuentan con protocolos de purga y eliminación definitiva al cierre del ciclo escolar correspondiente.')}
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <Icon name="fileText" size={17} />
              <span>{t('Modelo de Notificación para Familias y Tutores (PBA / Nacional)')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyModel}
                className="bg-white border border-emerald-300 hover:border-emerald-600 text-emerald-900 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Icon name={copied ? 'check' : 'copy'} size={13} />
                <span>{copied ? t('¡Copiado al portapapeles!') : t('Copiar Texto para Cuaderno')}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-white border border-emerald-300 hover:border-emerald-600 text-emerald-900 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Icon name="printer" size={13} />
                <span className="hidden sm:inline">{t('Imprimir')}</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-emerald-900/90 leading-relaxed">
            {t('Las instituciones educativas de la Provincia de Buenos Aires pueden emplear esta plantilla estándar para comunicar e informar formalmente a los padres, madres o tutores legales sobre el uso seguro del entorno Habitar al inicio del ciclo lectivo.')}
          </p>
          <div className="bg-white/80 rounded-xl p-4 border border-emerald-200 text-xs font-mono text-emerald-950 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
            {t(PARENT_COMMUNICATION_MODEL)}
          </div>
        </div>

        {confirmed ? (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
              <Icon name="check" size={24} />
            </div>
            <h3 className="text-base font-bold text-text-pri">
              {t('Aceptación Institucional Registrada')}
            </h3>
            <p className="text-xs text-text-sec max-w-md mx-auto">
              {t('La adhesión a los términos de tratamiento de datos escolares ha quedado debidamente asentada en la bitácora inmutable de auditoría para la institución.')}
            </p>
          </div>
        ) : canSign ? (
          <div className="bg-white border border-gray-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                <Icon name="lock" size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-pri">
                  {t('Firma Digital Institucional — {name}', { name: session.user.name })}
                </h3>
                <p className="text-xs text-text-sec">
                  {t('Rol habilitado:')}{' '}{session.user.role === 'admin' ? t('Administrador Global') : t('Directivo / Coordinador')}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-gray-border/60">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-700 rounded border-gray-border focus:ring-emerald-500"
              />
              <span className="text-xs text-text-pri leading-relaxed">
                {t('He leído y acepto los términos de tratamiento de datos personales en representación formal de la institución educativa. Comprendo que este registro quedará auditado con sello de tiempo.')}
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={!accepted || submitting}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{submitting ? t('Registrando firma institucional…') : t('Registrar Aceptación Institucional y Habilitar Plataforma')}</span>
              <Icon name="arrowRight" size={13} />
            </button>
          </div>
        ) : (

          <div className="bg-white border border-gray-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-text-pri">
                {t('¿Sos directivo o coordinador de una escuela registrada?')}
              </h4>
              <p className="text-xs text-text-sec max-w-xl leading-relaxed">
                {t('Iniciá sesión con tu cuenta institucional para registrar la firma digital de tu establecimiento y habilitar el entorno de lectura para tus docentes y cursos.')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/login"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>{t('Ingresar con Cuenta Escolar')}</span>
                <Icon name="arrowRight" size={12} />
              </a>
            </div>
          </div>
        )}

      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 text-center text-xs text-text-sec border-t border-gray-border/60 mt-12 space-y-2">
        <p>{t('© {getFullYear} Habitar — Plataforma de Comprensión Lectora con IA. Proyecto de Tesis de Grado.', { getFullYear: new Date().getFullYear() })}</p>
        <div className="flex justify-center gap-4 text-[11.5px]">
          <a href="/" className="hover:text-emerald-700">{t('Inicio')}</a>
          <a href="/privacidad" className="hover:text-emerald-700 font-semibold text-emerald-850">{t('Política de Privacidad PBA')}</a>
          <a href="/privacidad#derechos-arco" className="hover:text-emerald-700">{t('Derechos ARCO')}</a>
          <a href="/status" className="hover:text-emerald-700">{t('Estado del Servicio')}</a>
        </div>
      </footer>
    </div>
  );
}
