import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Icon } from '../ui/Icon';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onCodeScanned }: QrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camara' | 'manual'>('camara');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setDebugLogs((prev) => [...prev, \\ - \\].slice(-5));
  }

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    if (activeTab === 'camara') {
      setTimeout(startCamera, 100);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('teacher-qr-reader-container');
      }
      addLog('[html5-qrcode] Iniciando c�mara...');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 
        },
        (decodedText) => {
          addLog(\[html5-qrcode] QR Encontrado: \\);
          handleCodeScanned(decodedText);
        },
        (errorMessage) => {}
      );
      addLog('[html5-qrcode] C�mara iniciada y analizando.');
    } catch (err: any) {
      console.warn('Error accediendo a c�mara:', err);
      setCameraError('Permiso de c�mara no concedido o no disponible. Escrib� el c�digo manualmente.');
      setActiveTab('manual');
    }
  }

  function stopCamera() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
  }

  async function handleCodeScanned(code: string) {
    if (verifying) return;
    setVerifying(true);
    stopCamera();

    try {
      if ('vibrate' in navigator) navigator.vibrate(100);
    } catch {}

    let finalCode = code.trim();
    if (finalCode.includes('/aula/')) {
      finalCode = finalCode.split('/aula/')[1]?.split('?')[0]?.split('/')[0] || finalCode;
    } else if (finalCode.includes('code=')) {
      finalCode = finalCode.split('code=')[1]?.split('&')[0] || finalCode;
    }

    try {
      await onCodeScanned(finalCode);
      onClose();
    } catch (err) {
      setVerifying(false);
      startCamera();
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim());
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
              <h2 className="text-sm font-bold text-text-pri">Vincular Aula</h2>
              <p className="text-[11px] text-text-sec">Escane� el c�digo f�sico del aula</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-ter hover:text-text-pri p-2 rounded-lg transition-colors">?</button>
        </div>

        <div className="flex border-b border-gray-border dark:border-[#2D3342] text-xs font-semibold">
          <button onClick={() => setActiveTab('camara')} className={\lex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 \\}>
            <Icon name="camera" size={14} /> Escanear
          </button>
          <button onClick={() => setActiveTab('manual')} className={\lex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 \\}>
            <Icon name="code" size={14} /> Escribir PIN
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[320px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center gap-4">
              {cameraError ? (
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-3">
                  <p>{cameraError}</p>
                  <button onClick={() => setActiveTab('manual')} className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer">
                    Ingresar C�digo Manualmente
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-4 border-emerald-500/20">
                  <div id="teacher-qr-reader-container" className="w-full h-full [&_video]:object-cover" />

                  {verifying && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white space-y-3 z-20">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Vinculando...</span>
                    </div>
                  )}

                  {debugLogs.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-2 font-mono whitespace-pre-wrap break-all z-10 max-h-24 overflow-y-auto">
                      {debugLogs.join('\n')}
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-text-ter text-center max-w-[240px] leading-relaxed">
                Apunt� la c�mara al c�digo QR impreso que se encuentra en la pared o puerta del aula.
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-5">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-text-pri">Ingres� el C�digo del Aula</p>
                <p className="text-xs text-text-sec">Se encuentra debajo del c�digo QR (ej: AULA-6A-7821)</p>
              </div>
              <input type="text" required placeholder="AULA-..." value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="w-full border-2 border-emerald-600 rounded-xl px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-text-pri bg-emerald-50/30 dark:bg-emerald-950/30 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" autoFocus />
              <button type="submit" disabled={verifying || !manualCode.trim()} className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20">
                {verifying ? 'Vinculando...' : 'Vincular Aula ?'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
