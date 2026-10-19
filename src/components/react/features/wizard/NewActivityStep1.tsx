import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Stepper } from '../../ui/Stepper';
import { generateQuestions, validateWordCount } from '../../../../services/aiService';
import { getCourseById } from '../../../../services/courseService';
import { activityWizardStore, resetWizard, updateWizard } from '../../../../store/activityWizardStore';
import type { ComprehensionAxis, Course } from '../../../../types/activity';
import { useSession } from '../../../../hooks/useSession';
import { extractDocumentWithPreview } from '../../../../lib/documentText';
import { pickTextFromGoogleDrive } from '../../../../lib/googleDrive';
import { getOneDriveToken } from '../../../../lib/oneDrive';
import { getIntegrationsConfig, type IntegrationsConfig } from '../../../../services/integrationsService';
import { OneDrivePickerModal } from './OneDrivePickerModal';

const DEFAULT_TEXT =
  'La biodiversidad es el conjunto de formas de vida que habitan nuestro planeta. Cada ecosistema alberga especies que dependen entre sí para sobrevivir. Cuando una especie desaparece, las consecuencias se propagan en cadena hacia el resto del sistema. Proteger la biodiversidad no es solo una cuestión ambiental, sino también cultural y económica.';

export function NewActivityStep1() {
  const wizard = useStore(activityWizardStore);
  const [text, setText] = useState(wizard.sourceText || DEFAULT_TEXT);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [boundCourse, setBoundCourse] = useState<Course | null>(null);
  const session = useSession();
  const [integrations, setIntegrations] = useState<IntegrationsConfig | null>(null);
  const [importing, setImporting] = useState<'archivo' | 'drive' | 'onedrive' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const [oneDriveToken, setOneDriveToken] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    size: number;
    type: 'pdf' | 'docx' | 'text';
    objectUrl?: string;
    docxHtml?: string;
  } | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'text'>('preview');

  useEffect(() => {
    return () => {
      if (filePreview?.objectUrl) {
        URL.revokeObjectURL(filePreview.objectUrl);
      }
    };
  }, [filePreview?.objectUrl]);


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
      const picked = await pickTextFromGoogleDrive(integrations.googleDrive, provider === 'google' ? email : undefined);
      if (picked) applyImported(picked.name, picked.text, 'Google Drive');
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

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting('archivo');
    setImportError(null);
    try {
      const result = await extractDocumentWithPreview(file, file.name);
      applyImported(file.name, result.text, 'Archivo');

      if (filePreview?.objectUrl) {
        URL.revokeObjectURL(filePreview.objectUrl);
      }

      let objectUrl: string | undefined;
      if (result.previewType === 'pdf') {
        objectUrl = URL.createObjectURL(file);
      }

      setFilePreview({
        name: file.name,
        size: file.size,
        type: result.previewType,
        objectUrl,
        docxHtml: result.docxHtml,
      });
      setPreviewTab('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setImporting(null);
    }
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
            {importing === 'archivo' ? 'Leyendo archivo…' : 'Subir archivo (Word, PDF, texto)'}
            <input
              type="file"
              accept=".txt,.md,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
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
            Texto cargado desde {importedFrom}. Revisalo y editalo si hace falta: el archivo no se guarda en Habitar.
          </div>
        )}
                {filePreview && (
          <div className="mb-3.5 bg-white border border-gray-border rounded-lg overflow-hidden shadow-xs">
            <div className="bg-gray-50/80 border-b border-gray-border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  filePreview.type === 'pdf' ? 'bg-red-100 text-red-700' :
                  filePreview.type === 'docx' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {filePreview.type === 'docx' ? 'Word (.docx)' : filePreview.type.toUpperCase()}
                </span>
                <span className="text-xs font-medium text-text-pri truncate max-w-[200px] sm:max-w-[320px]">
                  {filePreview.name}
                </span>
                <span className="text-[11px] text-text-sec">
                  ({(filePreview.size / 1024).toFixed(0)} KB)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-md p-0.5 bg-gray-200">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('preview')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                      previewTab === 'preview'
                        ? 'bg-white text-text-pri shadow-xs'
                        : 'text-text-sec hover:text-text-pri'
                    }`}
                  >
                    <Icon name="eye" size={12} />
                    Vista previa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('text')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                      previewTab === 'text'
                        ? 'bg-white text-text-pri shadow-xs'
                        : 'text-text-sec hover:text-text-pri'
                    }`}
                  >
                    <Icon name="fileText" size={12} />
                    Texto extraído ({wordCount} pal.)
                  </button>
                </div>

                {filePreview.objectUrl && (
                  <a
                    href={filePreview.objectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir en pestaña nueva"
                    className="p-1.5 text-text-sec hover:text-text-pri rounded hover:bg-gray-200 transition-colors"
                  >
                    <Icon name="cast" size={13} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (filePreview.objectUrl) URL.revokeObjectURL(filePreview.objectUrl);
                    setFilePreview(null);
                  }}
                  title="Cerrar vista previa"
                  className="p-1.5 text-text-sec hover:text-red rounded hover:bg-red-50 transition-colors"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            </div>

            {previewTab === 'preview' ? (
              <div className="p-3 bg-gray-50/50">
                {filePreview.type === 'pdf' && filePreview.objectUrl && (
                  <iframe
                    src={filePreview.objectUrl}
                    title={`Vista previa de ${filePreview.name}`}
                    className="w-full h-[460px] rounded border border-gray-border bg-white"
                  />
                )}
                {filePreview.type === 'docx' && (
                  <div className="w-full h-[460px] overflow-y-auto p-6 bg-white border border-gray-border rounded text-text-pri text-xs leading-relaxed font-sans shadow-inner">
                    <div
                      className="prose prose-sm max-w-none [&_p]:mb-2.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-1.5 [&_th]:border [&_th]:border-gray-200 [&_th]:p-1.5 [&_th]:bg-gray-50 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: filePreview.docxHtml || '<p>No se pudo generar vista previa visual.</p>' }}
                    />
                  </div>
                )}
                {filePreview.type === 'text' && (
                  <pre className="w-full h-[460px] overflow-y-auto p-4 bg-white border border-gray-border rounded font-mono text-xs whitespace-pre-wrap leading-relaxed text-text-pri">
                    {text}
                  </pre>
                )}
                <div className="mt-2 text-[11px] text-text-sec flex items-center justify-between">
                  <span>Revisá el documento original arriba o editá abajo el texto extraído que procesará la IA.</span>
                  {filePreview.type === 'pdf' && filePreview.objectUrl && (
                    <a href={filePreview.objectUrl} target="_blank" rel="noopener noreferrer" className="text-green-dark hover:underline font-medium">
                      Ver PDF en pantalla completa
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {filePreview && previewTab === 'preview' && (
          <div className="text-[11px] font-medium text-text-sec mb-1">
            Texto extraído del documento (editable):
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={filePreview && previewTab === 'preview' ? 3 : 5}
          className="w-full px-2.5 py-2 border border-gray-border rounded-[6px] text-xs bg-white leading-relaxed resize-none"
        />
      </div>

      {generateError && (
        <div className="text-xs text-red bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-2.5">{generateError}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5">
        <div className="text-[11.5px] text-text-sec">
          <span className={`font-semibold ${isValid ? 'text-green-mid' : 'text-red'}`}>{wordCount} palabras</span>
          {' · '}
          {isValid ? 'Rango válido para nivel seleccionado (40–600)' : 'El texto debe tener entre 40 y 600 palabras'}
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
        onPicked={(file) => {
          applyImported(file.name, file.text, 'OneDrive');
          setOneDriveToken(null);
        }}
      />
    </div>
  );
}
