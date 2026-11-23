import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useQrScanner } from '../../../hooks/useQrScanner';
import { looksLikeUrl, parseScannedQr } from '../../../lib/qrCode';
import { getCourseByQrCode } from '../../../services/courseService';
import type { Course } from '../../../types/activity';
import { t, useI18n } from '../../../i18n';

const READER_ID = 'teacher-qr-reader-container';

const TAB_BASE = 'flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 cursor-pointer';
const TAB_ACTIVE = 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30';
const TAB_IDLE = 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseDetected: (course: Course) => void;
}

export function QrScannerModal({ isOpen, onClose, onCourseDetected }: QrScannerModalProps) {
  useI18n();
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camara' | 'manual'>('camara');
  const [linkError, setLinkError] = useState<string | null>(null);

  async function resolveCourse(rawText: string) {
    const { code } = parseScannedQr(rawText);
    if (!code) {
      setLinkError(t('Ese código QR no contiene un código de aula.'));
      resume();
      return;
    }

    setVerifying(true);
    setLinkError(null);
    try {
      const course = await getCourseByQrCode(code);
      onCourseDetected(course);
      onClose();
    } catch (err) {
      setLinkError(
        err instanceof Error && err.message ? err.message : t('No encontramos un aula con el código {code}.', { code })
      );
      resume();
    } finally {
      setVerifying(false);
    }
  }

  const { status, error: cameraError, logs, resume } = useQrScanner({
    elementId: READER_ID,
    enabled: isOpen && activeTab === 'camara' && !verifying,
    onScan: resolveCourse,
  });

  useEffect(() => {
    if (cameraError) setActiveTab('manual');
  }, [cameraError]);

  useEffect(() => {
    if (!isOpen) {
      setManualCode('');
      setLinkError(null);
      setVerifying(false);
      setActiveTab('camara');
    }
  }, [isOpen]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    void resolveCourse(code);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col">
        <div className="px-5 py-4 bg-gray-50/90 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-xl">
              <Icon name="camera" size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-pri">{t('Vincular Aula')}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Cerrar')} title={t('Cerrar')} className="text-text-ter hover:text-text-pri p-2 rounded-lg transition-colors cursor-pointer"><Icon name="close" size={16} /></button>
        </div>

        <div className="flex border-b border-gray-border dark:border-[#2D3342] text-xs font-semibold">
          <button onClick={() => setActiveTab('camara')} className={`${TAB_BASE} ${activeTab === 'camara' ? TAB_ACTIVE : TAB_IDLE}`}>
            <Icon name="camera" size={14} />{' '}{t('Escanear')}
          </button>
          <button onClick={() => setActiveTab('manual')} className={`${TAB_BASE} ${activeTab === 'manual' ? TAB_ACTIVE : TAB_IDLE}`}>
            <Icon name="code" size={14} />{' '}{t('Escribir PIN')}
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[320px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-4 border-emerald-500/20">
                <div id={READER_ID} className="w-full h-full [&_video]:object-cover" />

                {status === 'starting' && !verifying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-[11px] gap-2 z-10">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>{t('Encendiendo cámara…')}</span>
                  </div>
                )}

                {verifying && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white space-y-3 z-20">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">{t('Vinculando…')}</span>
                  </div>
                )}

                {logs.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-2 font-mono whitespace-pre-wrap break-all z-10 max-h-24 overflow-y-auto">
                    {logs.join('\n')}
                  </div>
                )}
              </div>

              {linkError && (
                <p className="text-[11px] text-red-700 dark:text-red-300 text-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg px-3 py-2">
                  {linkError}
                </p>
              )}

              <p className="text-[11px] text-text-ter text-center max-w-[240px] leading-relaxed">
                {t('Apuntá la cámara al código QR impreso que se encuentra en la pared o puerta del aula.')}
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-5">
              {cameraError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  {cameraError}
                </div>
              )}

              {linkError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
                  {linkError}
                </div>
              )}

              <input
                type="text"
                required
                placeholder="AULA-..."
                value={manualCode}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualCode(looksLikeUrl(value) ? value : value.toUpperCase());
                }}
                className="w-full border-2 border-emerald-600 rounded-xl px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-text-pri bg-emerald-50/30 dark:bg-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                autoFocus
              />
              <button
                type="submit"
                disabled={verifying || !manualCode.trim()}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20 cursor-pointer"
              >
                {verifying ? t('Vinculando...') : t('Vincular Aula →')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
