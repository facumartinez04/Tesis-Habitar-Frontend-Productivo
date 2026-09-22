import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useQrScanner } from '../../../hooks/useQrScanner';
import { looksLikeUrl, parseScannedQr, type ScannedCodeType } from '../../../lib/qrCode';

const READER_ID = 'qr-reader-container';

const TAB_BASE = 'flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer';
const TAB_ACTIVE = 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30';
const TAB_IDLE = 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string, type: ScannedCodeType) => void;
}

export function StudentQrScannerModal({ isOpen, onClose, onCodeScanned }: StudentQrScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camara' | 'manual'>('camara');
  const [parseError, setParseError] = useState<string | null>(null);

  function handleScannedText(rawText: string) {
    const { code, type } = parseScannedQr(rawText);
    if (!code) {
      setParseError('Ese código QR no corresponde a un aula ni a una actividad de Habitar.');
      resume();
      return;
    }
    setParseError(null);
    onCodeScanned(code, type);
    onClose();
  }

  const { status, error: cameraError, logs, resume } = useQrScanner({
    elementId: READER_ID,
    enabled: isOpen && activeTab === 'camara',
    onScan: handleScannedText,
  });

  useEffect(() => {
    if (cameraError) setActiveTab('manual');
  }, [cameraError]);

  useEffect(() => {
    if (!isOpen) {
      setManualCode('');
      setParseError(null);
      setActiveTab('camara');
    }
  }, [isOpen]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    handleScannedText(code);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col">
        <div className="px-5 py-3.5 bg-gray-50/90 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <Icon name="camera" size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-pri">Escanear Código QR</h2>
              <p className="text-[11px] text-text-sec">Del aula física o de la actividad</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-text-ter hover:text-text-pri p-1 rounded-lg text-sm font-bold cursor-pointer">✕</button>
        </div>

        <div className="flex border-b border-gray-border dark:border-[#2D3342] text-xs font-semibold">
          <button onClick={() => setActiveTab('camara')} className={`${TAB_BASE} ${activeTab === 'camara' ? TAB_ACTIVE : TAB_IDLE}`}>
            <Icon name="camera" size={13} /> Cámara
          </button>
          <button onClick={() => setActiveTab('manual')} className={`${TAB_BASE} ${activeTab === 'manual' ? TAB_ACTIVE : TAB_IDLE}`}>
            <Icon name="code" size={13} /> Escribir PIN
          </button>
        </div>

        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[290px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-2 border-emerald-500">
                <div id={READER_ID} className="w-full h-full [&_video]:object-cover" />

                {status === 'starting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-[11px] gap-2 z-10">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Encendiendo cámara…</span>
                  </div>
                )}

                {logs.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-2 font-mono whitespace-pre-wrap break-all z-10 max-h-24 overflow-y-auto">
                    {logs.join('\n')}
                  </div>
                )}
              </div>

              {parseError && (
                <p className="text-[11px] text-red-700 dark:text-red-300 text-center mt-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg px-3 py-2">
                  {parseError}
                </p>
              )}

              <p className="text-[11px] text-text-ter text-center mt-3 max-w-xs">
                Apuntá la cámara al código QR impreso en el aula o mostrado en la pantalla del docente.
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              {cameraError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  {cameraError}
                </div>
              )}

              {parseError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
                  {parseError}
                </div>
              )}

              <input
                type="text"
                required
                placeholder="HAB-4B29"
                value={manualCode}
                onChange={(e) => {
                  const value = e.target.value;

                  setManualCode(looksLikeUrl(value) ? value : value.toUpperCase());
                }}
                className="w-full border-2 border-emerald-600 rounded-xl px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-text-pri bg-emerald-50/30 dark:bg-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Ingresar →
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
