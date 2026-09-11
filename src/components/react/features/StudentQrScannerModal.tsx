import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string, type: 'activity' | 'course' | 'url') => void;
}

export function StudentQrScannerModal({
  isOpen,
  onClose,
  onCodeScanned,
}: StudentQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camara' | 'manual'>('camara');

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeTab === 'camara') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  async function startCamera() {
    setCameraError(null);
    setScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está disponible en este navegador o dispositivo.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.warn('Error accediendo a cámara:', err);
      setHasCamera(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara no concedido. Podés escribir el código PIN manualmente.'
          : 'No se pudo iniciar la cámara en este equipo. Podés ingresar el código a continuación.'
      );
      setActiveTab('manual');
    }
  }

  function stopCamera() {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function handleRawScannedText(rawText: string) {
    if (verifying) return;
    setVerifying(true);
    stopCamera();

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch {}

    const text = rawText.trim();

    // 1. Detectar si es URL de aula
    if (text.includes('/aula')) {
      let code = '';
      if (text.includes('code=')) {
        try {
          code = new URL(text).searchParams.get('code') || '';
        } catch {
          code = text.split('code=').pop()?.split('&')[0] || '';
        }
      } else {
        code = text.split('/aula/').pop()?.split('?')[0] || '';
      }
      onCodeScanned(code || text, 'course');
      onClose();
      return;
    }

    // 2. Detectar si es URL de actividad
    if (text.includes('/actividad')) {
      let code = '';
      if (text.includes('code=')) {
        try {
          code = new URL(text).searchParams.get('code') || '';
        } catch {
          code = text.split('code=').pop()?.split('&')[0] || '';
        }
      } else {
        code = text.split('/actividad/').pop()?.split('?')[0] || '';
      }
      onCodeScanned(code || text, 'activity');
      onClose();
      return;
    }

    // 3. Detectar si es texto plano de código de aula (ej: AULA-XXXX)
    if (text.toUpperCase().startsWith('AULA-')) {
      onCodeScanned(text.toUpperCase(), 'course');
      onClose();
      return;
    }

    // 4. Por defecto, tratar como código de actividad o PIN
    onCodeScanned(text.toUpperCase(), 'activity');
    onClose();
  }

  async function scanLoop() {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // 1. Intentar BarcodeDetector nativo
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const val = barcodes[0].rawValue;
            if (val) {
              handleRawScannedText(val);
              return;
            }
          }
        } catch {}
      }
    }

    if (streamRef.current) {
      requestAnimationFrame(scanLoop);
    }
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
        {/* Cabecera */}
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
          <button
            onClick={onClose}
            className="text-text-ter hover:text-text-pri p-1 rounded-lg text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de modo */}
        <div className="flex border-b border-gray-border dark:border-[#2D3342] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camara')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'camara'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]'
            }`}
          >
            <Icon name="camera" size={13} />
            Cámara
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-text-sec hover:bg-gray-50 dark:hover:bg-[#1A1E29]'
            }`}
          >
            <Icon name="code" size={13} />
            Escribir PIN
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[290px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-3">
                  <p>{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Ingresar Código Manualmente
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-2 border-emerald-500">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Retícula de escaneo */}
                  <div className="absolute inset-5 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="w-full flex justify-between">
                      <span className="w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
                      <span className="w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />
                    <div className="w-full flex justify-between">
                      <span className="w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
                      <span className="w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {verifying && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold">
                      Conectando…
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-text-ter text-center mt-3 max-w-xs">
                Apuntá la cámara al código QR impreso en el aula o mostrado en la pantalla del docente.
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-text-pri">Ingresá el Código o PIN</p>
                <p className="text-[11.5px] text-text-sec">
                  Puede ser el PIN de la actividad (ej: <strong>HAB-4B29</strong>) o el código del aula (ej: <strong>AULA-6A-7821</strong>).
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="HAB-4B29"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="w-full border-2 border-emerald-600 rounded-xl px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-text-pri bg-emerald-50/30 dark:bg-emerald-950/30 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={verifying || !manualCode.trim()}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                {verifying ? 'Verificando…' : 'Ingresar →'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50/80 dark:bg-[#1A1E29] border-t border-gray-border dark:border-[#2D3342] flex items-center justify-between text-xs text-text-ter">
          <span>Habitar • Modo Alumno</span>
          <button onClick={onClose} className="hover:text-text-pri font-medium cursor-pointer">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
