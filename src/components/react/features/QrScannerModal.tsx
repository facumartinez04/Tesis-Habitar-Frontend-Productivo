import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { getCourseByQrCode } from '../../../services/courseService';
import type { Course } from '../../../types/activity';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseDetected: (course: Course) => void;
}

export function QrScannerModal({ isOpen, onClose, onCourseDetected }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'camara' | 'manual' | 'archivo'>('camara');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`].slice(-5));
  }

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
        throw new Error('La cámara no está disponible en este navegador o entorno.');
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
          ? 'Permiso de cámara denegado. Podés ingresar el código del aula manualmente.'
          : 'No se pudo iniciar la cámara en este dispositivo. Podés ingresar el código del aula a continuación.'
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

  async function handleCodeScanned(rawText: string) {
    if (verifying) return;
    setVerifying(true);
    stopCamera();

    let cleanCode = rawText.trim();
    try {
      if (cleanCode.includes('/aula/')) {
        cleanCode = cleanCode.split('/aula/').pop()?.split('?')[0] || cleanCode;
      } else if (cleanCode.includes('code=')) {
        cleanCode = new URL(cleanCode).searchParams.get('code') || cleanCode;
      }
    } catch {
      if (cleanCode.includes('code=')) {
        cleanCode = cleanCode.split('code=')[1]?.split('&')[0] || cleanCode;
      }
    }

    try {
      const course = await getCourseByQrCode(cleanCode);
      onCourseDetected(course);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Código QR no reconocido como aula válida');
      setVerifying(false);
      if (activeTab === 'camara') {
        startCamera();
      }
    }
  }

  async function scanLoop() {
    if (!scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(video);
          if (Math.random() < 0.1) addLog('[Nativo] Analizando...');
          if (barcodes && barcodes.length > 0) {
            const qrValue = barcodes[0].rawValue;
            if (qrValue) {
              addLog(`[Nativo] QR Encontrado: ${qrValue}`);
              await handleCodeScanned(qrValue);
              return;
            }
          }
        } catch (e: any) {
          if (Math.random() < 0.1) addLog(`[Nativo Error] ${e.message}`);
        }
      } else {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (Math.random() < 0.1) addLog('[jsQR] Analizando...');
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            addLog(`[jsQR] QR Encontrado: ${code.data}`);
            await handleCodeScanned(code.data);
            return;
          }
        }
      }
    }

    if (scanning && streamRef.current) {
      setTimeout(() => requestAnimationFrame(scanLoop), 250);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCodeScanned(manualCode.trim());
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const barcodes = await detector.detect(img);
        if (barcodes && barcodes.length > 0) {
          await handleCodeScanned(barcodes[0].rawValue);
          return;
        }
        alert('No se detectó ningún código QR en la imagen cargada.');
      } catch {
        alert('No se pudo procesar la imagen.');
      }
    } else {
      alert('Tu navegador no soporta lectura automática desde imagen. Ingresá el código del aula manualmente.');
      setActiveTab('manual');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-border flex flex-col">
        {}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Icon name="kanban" size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-pri">Escanear QR de Aula</h2>
              <p className="text-[11px] text-text-sec">Conectá con el aula física para subir material</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-ter hover:text-text-pri p-1 rounded-md text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {}
        <div className="flex border-b border-gray-border text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camara')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'camara'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-text-sec hover:bg-gray-50'
            }`}
          >
            <Icon name="sparkles" size={13} />
            Cámara en vivo
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-text-sec hover:bg-gray-50'
            }`}
          >
            <Icon name="code" size={13} />
            Código Manual
          </button>
          <button
            onClick={() => setActiveTab('archivo')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'archivo'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-text-sec hover:bg-gray-50'
            }`}
          >
            <Icon name="folder" size={13} />
            Subir Foto
          </button>
        </div>

        {}
        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[300px]">
          {activeTab === 'camara' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-3">
                  <p>{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs"
                  >
                    Ingresar Código Manualmente
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border-2 border-emerald-600">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {}
                  <div className="absolute inset-6 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="w-full flex justify-between">
                      <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />
                    <div className="w-full flex justify-between">
                      <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {verifying && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold">
                      Conectandoâ€¦
                    </div>
                  )}

                  {debugLogs.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[10px] p-2 font-mono whitespace-pre-wrap break-all z-10 max-h-24 overflow-y-auto">
                      {debugLogs.join('\n')}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-text-ter text-center mt-3 max-w-xs">
                Apuntá con la cámara al cartel con el QR fijo que está pegado en el aula o escritorio.
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-text-pri">Ingresá el Identificador del Aula</p>
                <p className="text-[11.5px] text-text-sec">
                  Podés encontrar este código debajo del código QR en el cartel físico del aula.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="ej. AULA-6A-7821"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="w-full border-2 border-emerald-600 rounded-xl px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-text-pri bg-emerald-50/30 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifying || !manualCode.trim()}
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {verifying ? 'Verificando…' : 'Conectar al Aula →'}
              </button>
            </form>
          )}

          {activeTab === 'archivo' && (
            <div className="w-full flex flex-col items-center justify-center space-y-3 py-4">
              <div className="border-2 border-dashed border-gray-border hover:border-emerald-500 rounded-2xl p-6 w-full text-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="qr-file-input"
                />
                <label htmlFor="qr-file-input" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <Icon name="folder" size={20} />
                  </div>
                  <div className="text-xs font-semibold text-text-pri">
                    Elegí una foto del cartel del aula
                  </div>
                  <div className="text-[11px] text-text-ter">Formatos PNG, JPG o captura de pantalla</div>
                </label>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-border flex items-center justify-between text-xs text-text-ter">
          <span>Habitar • Conexión de Aula</span>
          <button onClick={onClose} className="hover:text-text-pri font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
