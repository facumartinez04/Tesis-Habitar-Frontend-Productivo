import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { generateQuestions, validateWordCount } from '../../../../services/aiService';
import { getCourseById } from '../../../../services/courseService';
import { activityWizardStore, resetWizard, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis, Course } from '../../../../types/activity';
import { useSession } from '../../../../hooks/useSession';
import { pickFileFromGoogleDrive } from '../../../../lib/googleDrive';
import { DocumentReviewModal, type ImportedDocument } from './DocumentReviewModal';
import { getOneDriveToken } from '../../../../lib/oneDrive';
import { getIntegrationsConfig, type IntegrationsConfig } from '../../../../services/integrationsService';
import { OneDrivePickerModal } from './OneDrivePickerModal';
import { ActivityBankModal } from './ActivityBankModal';
import { fetchActivityTemplate, type ActivityTemplateSummary } from '../../../../services/activityService';
import { clearWizardDocument, documentKind, saveWizardDocument } from '../../../../lib/wizardDocument';

const DEFAULT_TEXT =
  'La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para sobrevivir. Cuando una especie desaparece, las consecuencias se propagan en cadena hacia el resto del sistema. Proteger la biodiversidad no es solo una cuestión ambiental, sino también cultural y económica.';

export function NewActivityStep1() {
  const wizard = useStore(activityWizardStore);
  // Cada actividad nueva arranca con el texto vacío (no se arrastra el de la anterior).
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [boundCourse, setBoundCourse] = useState<Course | null>(null);
  const session = useSession();
  const [integrations, setIntegrations] = useState<IntegrationsConfig | null>(null);
  const [importing, setImporting] = useState<'archivo' | 'drive' | 'onedrive' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const [oneDriveToken, setOneDriveToken] = useState<string | null>(null);
  // Documento abierto en «Revisar documento», y el último usado (para volver a verlo).
  const [reviewDoc, setReviewDoc] = useState<ImportedDocument | null>(null);
  const [lastDoc, setLastDoc] = useState<ImportedDocument | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  /** Actividad del banco: carga su texto y sus preguntas y pasa directo a revisarlas (sin volver a generar). */
  async function handlePickTemplate(t: ActivityTemplateSummary) {
    setLoadingTemplate(true);
    try {
      const { sourceText, questions, template } = await fetchActivityTemplate(t.id);
      await clearWizardDocument();
      updateWizard({
        sourceText,
        wordCount: template.wordCount,
        questions,
        templateId: template.id,
        documentName: template.hasDocument ? `${template.documentFileName ?? 'documento'} (del banco)` : null,
        educationLevel: template.educationLevel || wizard.educationLevel,
        name: template.name,
      });
      window.location.href = '/docente/actividades/nueva/revisar';
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo usar la actividad del banco.');
      setLoadingTemplate(false);
    }
  }


  useEffect(() => {
    updateWizard({ sourceText: '', wordCount: 0, questions: [], documentName: null, templateId: null, generatedCode: null, generatedActivityId: null });
    void clearWizardDocument();
  }, []);

  useEffect(() => {
    getIntegrationsConfig().then(setIntegrations).catch(() => setIntegrations({ googleDrive: null, oneDrive: null }));
  }, []);

  // El repositorio que corresponde a la cuenta con que entró el docente se muestra primero.
  const provider = session?.provider;
  const email = session?.user.email;

  function applyImported(name: string, content: string, origin: string) {
    setText(content);
    updateWizard({ sourceText: content });
    setImportedFrom(`${origin}: ${name}`);
    setImportError(null);
  }

  async function handleGoogleDrive() {
    if (!integrations?.googleDrive) return;
    setImporting('drive');
    setImportError(null);
    try {
      const picked = await pickFileFromGoogleDrive(integrations.googleDrive, provider === 'google' ? email : undefined);
      if (picked) setReviewDoc({ ...picked, origin: 'Google Drive' });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo traer el archivo de Google Drive.');
    } finally {
      setImporting(null);
    }
  }

  async function handleOneDrive() {
    if (!integrations?.oneDrive) return;
    setImporting('onedrive');
    setImportError(null);
    try {
      setOneDriveToken(await getOneDriveToken(integrations.oneDrive, provider === 'microsoft' ? email : undefined));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo conectar con OneDrive.');
    } finally {
      setImporting(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseIdParam = params.get('courseId');
    // La recomendación del tablero abre el asistente con el eje foco ya elegido.
    const focusParam = params.get('focus');
    if (focusParam === 'literal' || focusParam === 'inferencial' || focusParam === 'critico') {
      updateWizard({ focusAxis: focusParam, axis: focusParam });
    }
    const targetCourseId = courseIdParam || wizard.courseId;

    if (targetCourseId) {
      getCourseById(targetCourseId)
        .then((course) => {
          if (course) {
            setBoundCourse(course);
            updateWizard({
              courseId: course.id,
              courseName: course.name,
            });
          }
        })
        .catch(() => {

        });
    }
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isValid = validateWordCount(wordCount);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    setReviewDoc({ name: file.name, file, mimeType: file.type, origin: 'Tu computadora' });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateQuestions(text, wizard.focusAxis ?? undefined);
      updateWizard({
        sourceText: text,
        wordCount: result.wordCount,
        questions: result.questions,
      });
      window.location.href = '/docente/actividades/nueva/revisar';
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'No se pudieron generar las preguntas. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Nueva actividad</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">Cargá el texto fuente para generar preguntas con IA</div>

      <Stepper
        steps={[
          { label: 'Texto', state: 'current' },
          { label: 'Revisar', state: 'pending' },
          { label: 'Configurar', state: 'pending' },
          { label: 'QR', state: 'pending' },
        ]}
      />

      {}
      {(boundCourse || wizard.courseName) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
              <Icon name="school" size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-950 flex items-center gap-2">
                <span>Aula asignada: <strong>{boundCourse?.name || wizard.courseName}</strong></span>
                {boundCourse?.qrCode && (
                  <span className="text-[10.5px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-medium">
                    QR: {boundCourse.qrCode}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-700">
                {boundCourse?.room ? `Salón: ${boundCourse.room} · ` : ''}
                Esta actividad y sus preguntas quedarán vinculadas al aula fija.
              </div>
            </div>
          </div>
          <a
            href="/docente"
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline shrink-0"
          >
            Cambiar aula
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Nivel educativo</label>
          <select
            className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            value={wizard.educationLevel}
            onChange={(e) => updateWizard({ educationLevel: e.target.value })}
          >
            <option>Secundario — 4°</option>
            <option>Secundario — 5°</option>
            <option>Primario — 6°</option>
          </select>
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Eje foco</label>
          <select
            className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white"
            value={wizard.focusAxis ?? ''}
            onChange={(e) => {
              const value = e.target.value as ComprehensionAxis | '';
              updateWizard({ focusAxis: value || null, axis: value || 'inferencial' });
            }}
          >
            <option value="">Sin foco — mezcla estándar</option>
            <option value="literal">Literal (3 de 5 preguntas)</option>
            <option value="inferencial">Inferencial (3 de 5 preguntas)</option>
            <option value="critico">Crítico (3 de 5 preguntas)</option>
          </select>
        </div>
      </div>

      <div className="form-group mb-2.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Texto fuente</label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-[6px] px-2.5 py-1.5 text-xs cursor-pointer font-medium transition-colors">
            <Icon name="fileText" size={13} />
            Subir archivo (Word, PDF, texto)
            <input
              type="file"
              accept=".txt,.md,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            type="button"
            onClick={() => setBankOpen(true)}
            disabled={loadingTemplate}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-text-pri font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            <Icon name="layers" size={12} />
            {loadingTemplate ? 'Cargando…' : 'Banco de la institución'}
          </button>
          <button
            type="button"
            onClick={() => { setText(DEFAULT_TEXT); resetWizard(); }}
            className="flex items-center gap-1.5 bg-white border border-gray-border rounded-[6px] px-2.5 py-1.5 text-xs text-text-sec hover:text-text-pri"
          >
            <Icon name="refresh" size={12} />
            Texto de ejemplo
          </button>
          {(provider === 'microsoft' ? ['onedrive', 'drive'] : ['drive', 'onedrive']).map((source) => {
            const isDrive = source === 'drive';
            const configured = isDrive ? Boolean(integrations?.googleDrive) : Boolean(integrations?.oneDrive);
            const isOwn = isDrive ? provider === 'google' : provider === 'microsoft';
            return (
              <button
                key={source}
                type="button"
                onClick={isDrive ? handleGoogleDrive : handleOneDrive}
                disabled={!configured || importing !== null}
                title={
                  !configured
                    ? `${isDrive ? 'Google Drive' : 'OneDrive'} todavía no está habilitado en el servidor`
                    : isOwn
                      ? `Abrir ${isDrive ? 'tu Google Drive' : 'tu OneDrive'} (${email})`
                      : `Abrir ${isDrive ? 'Google Drive' : 'OneDrive'} con otra cuenta`
                }
                className={`flex items-center gap-1.5 border rounded-[6px] px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  isOwn && configured
                    ? 'bg-white border-green-mid text-text-pri font-medium hover:bg-gray-50'
                    : 'bg-white border-gray-border text-text-sec hover:bg-gray-50'
                }`}
              >
                <Icon name={isDrive ? 'folder' : 'cloud'} size={13} />
                {importing === source ? 'Abriendo…' : isDrive ? 'Google Drive' : 'OneDrive'}
              </button>
            );
          })}
        </div>
        {importError && (
          <div role="alert" className="text-xs text-red bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-2">{importError}</div>
        )}
        {importedFrom && !importError && (
          <div className="text-[11.5px] text-text-sec mb-2 flex items-center gap-1.5">
            <Icon name="check" size={12} className="text-green-mid" />
            Texto cargado desde {importedFrom}. Es el que usa la IA para las preguntas: revisalo y editalo si hace falta.
          </div>
        )}
        {wizard.documentName && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-[6px] px-3 py-2 mb-2">
            <Icon name="fileText" size={13} />
            <span>
              Los alumnos van a leer el documento original: <strong>{wizard.documentName}</strong>. Se borra de Habitar al cerrar la
              actividad.
            </span>
            <button
              type="button"
              onClick={() => {
                void clearWizardDocument();
                updateWizard({ documentName: null });
              }}
              className="font-semibold underline cursor-pointer"
            >
              Mostrar sólo el texto
            </button>
          </div>
        )}
        {lastDoc && (
          <button type="button" onClick={() => setReviewDoc(lastDoc)} className="text-[11.5px] font-semibold text-green-dark hover:underline mb-2 inline-flex items-center gap-1 cursor-pointer">
            <Icon name="eye" size={12} />
            Ver el documento y cambiar las páginas
          </button>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pegá acá el texto que van a leer los alumnos, o subí un archivo (Word, PDF o texto)."
          rows={6}
          className="w-full px-2.5 py-2 border border-gray-border rounded-[6px] text-xs bg-white leading-relaxed resize-none"
        />
      </div>

      {generateError && (
        <div className="text-xs text-red bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-2.5">{generateError}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5">
        <div className="text-[11.5px] text-text-sec">
          {wordCount === 0 ? (
            'Cargá un texto de entre 40 y 600 palabras'
          ) : (
            <>
              <span className={`font-semibold ${isValid ? 'text-green-mid' : 'text-red'}`}>{wordCount} palabras</span>
              {' · '}
              {isValid ? 'Rango válido para nivel seleccionado (40–600)' : 'El texto debe tener entre 40 y 600 palabras'}
            </>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!isValid || generating}
          className="flex items-center justify-center gap-1.5 bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {generating ? 'Generando…' : (
            <>
              Generar preguntas
              <Icon name="sparkles" size={13} />
            </>
          )}
        </button>
      </div>
      <OneDrivePickerModal
        token={oneDriveToken}
        isOpen={Boolean(oneDriveToken)}
        onClose={() => setOneDriveToken(null)}
        onPicked={(picked) => {
          setOneDriveToken(null);
          setReviewDoc({ ...picked, origin: 'OneDrive' });
        }}
      />
      <ActivityBankModal isOpen={bankOpen} onClose={() => setBankOpen(false)} onPick={(t) => { setBankOpen(false); void handlePickTemplate(t); }} />
      <DocumentReviewModal
        document={reviewDoc}
        onClose={() => setReviewDoc(null)}
        onUse={(content, label, pages) => {
          if (reviewDoc) {
            applyImported(label, content, reviewDoc.origin);
            setLastDoc(reviewDoc);
            // El PDF o Word original se guarda para que los alumnos lo lean tal cual (el .txt ya es su texto).
            if (documentKind(reviewDoc.name, reviewDoc.mimeType)) {
              void saveWizardDocument({ name: reviewDoc.name, mimeType: reviewDoc.mimeType, file: reviewDoc.file, pages });
              updateWizard({ documentName: label });
            } else {
              void clearWizardDocument();
              updateWizard({ documentName: null });
            }
          }
          setReviewDoc(null);
        }}
      />
    </div>
  );
}
