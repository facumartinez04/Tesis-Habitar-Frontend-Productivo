import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Icon } from '../ui/Icon';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string, type: 'activity' | 'course' | 'url') => void;
}

export function StudentQrScannerModal({ isOpen, onClose, onCodeScanned }: StudentQrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camara' | 'manual'>('camara');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`].slice(-5));
  }

  useEffect(() => {
    if (!isOpen) { stopCamera(); return; }
    if (activeTab === 'camara') { setTimeout(startCamera, 100); } else { stopCamera(); }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode('qr-reader-container');
      addLog('[html5-qrcode] Iniciando cámara...');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => { addLog(`[html5-qrcode] QR Encontrado: ${decodedText}`); handleRawScannedText(decodedText); },
        () => {}
      );
      addLog('[html5-qrcode] Cámara iniciada y analizando.');
    } catch (err: any) {
      setCameraError('No se pudo iniciar la cámara.');
      setActiveTab('manual');
    }
  }

  function stopCamera() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
  }

  function handleRawScannedText(rawText: string) {
    if (verifying) return;
    setVerifying(true);
    stopCamera();

    try { if ('vibrate' in navigator) navigator.vibrate(100); } catch {}

    const text = rawText.trim();
    if (text.includes('/aula') || text.toUpperCase().startsWith('AULA-')) {
      let code = text;
      try {
        const url = new URL(text, window.location.origin);
        code = url.searchParams.get('code') || '';
        if (!code && url.pathname.includes('/aula/')) code = url.pathname.split('/aula/')[1]?.split('/')[0] || '';
      } catch {
        if (text.includes('code=')) code = text.split('code=')[1]?.split('&')[0] || '';
        else if (text.includes('/aula/')) code = text.split('/aula/')[1]?.split('?')[0]?.split('/')[0] || '';
      }
      onCodeScanned((code || text).toUpperCase(), 'course');
      onClose();
      return;
    }

    if (text.includes('/actividad')) {
      let code = text;
      try {
        const url = new URL(text, window.location.origin);
        code = url.searchParams.get('code') || '';
        if (!code && url.pathname.includes('/actividad/')) code = url.pathname.split('/actividad/')[1]?.split('/')[0] || '';
      } catch {
        if (text.includes('code=')) code = text.split('code=')[1]?.split('&')[0] || '';
        else if (text.includes('/actividad/')) code = text.split('/actividad/')[1]?.split('?')[0]?.split('/')[0] || '';
      }
      onCodeScanned((code || text).toUpperCase(), 'activity');
      onClose();
      return;
    }

    onCodeScanned(text.toUpperCase(), 'activity');
    onClose();
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleRawScannedText(manualCode.trim());
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
          <button onClick={onClose} className="text-text-ter hover:text-text-pri p-1 rounded-lg text-sm font-bold cursor-pointer">✕</button>
        </div>

        <div className="flex border-b border-gray-border dark:border-[#2D3342] text-xs font-semibold">
          <button onClick={() => setActiveTab('camara')} className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'camara' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]'}`}>
            <Icon name="camera" size={13} /> Cámara
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'manual' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]'}`}>
            <Icon name="code" size={13} /> Escribir PIN
          </button>
        </div>

        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[290px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-3">
                  <p>{cameraError}</p>
                  <button onClick={() => setActiveTab('manual')} className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer">
                    Ingresar Código Manualmente
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-2 border-emerald-500">
                  <div id="qr-reader-container" className="w-full h-full [&_video]:object-cover" />
                  {verifying && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold z-20">Conectando…</div>
                  )}
                  {debugLogs.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-2 font-mono whitespace-pre-wrap break-all z-10 max-h-24 overflow-y-auto">
                      {debugLogs.join('\n')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <input type="text" required placeholder="HAB-4B29" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="w-full border-2 border-emerald-600 rounded-xl px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-text-pri bg-emerald-50/30 dark:bg-emerald-950/30 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500" autoFocus />
              <button type="submit" disabled={verifying || !manualCode.trim()} className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer">
                {verifying ? 'Verificando…' : 'Ingresar →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
