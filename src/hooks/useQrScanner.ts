import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type QrScannerStatus = 'idle' | 'starting' | 'scanning' | 'error';

interface UseQrScannerOptions {
  elementId: string;
  enabled: boolean;
  onScan: (text: string) => void;
}

interface UseQrScannerResult {
  status: QrScannerStatus;
  error: string | null;
  logs: string[];
  resume: () => void;
}

const INSECURE_CONTEXT =
  'La cámara sólo funciona sobre HTTPS. Abrí Habitar desde su dirección https:// ' +
  '(o desde localhost) o ingresá el código a mano.';

function describeCameraError(err: unknown): string {
  const name = typeof err === 'object' && err && 'name' in err ? String((err as Error).name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'No diste permiso para usar la cámara. Habilitalo desde el candado de la barra de direcciones o ingresá el código a mano.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No encontramos ninguna cámara en este dispositivo. Ingresá el código a mano.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La cámara está siendo usada por otra aplicación. Cerrala e intentá de nuevo.';
    case 'OverconstrainedError':
      return 'No pudimos usar la cámara trasera de este dispositivo. Ingresá el código a mano.';
    default:
      return 'No se pudo iniciar la cámara. Ingresá el código a mano.';
  }
}

function waitForElement(id: string, timeoutMs = 1500): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const deadline = performance.now() + timeoutMs;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) return resolve(el);
      if (performance.now() > deadline) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export function useQrScanner({ elementId, enabled, onScan }: UseQrScannerOptions): UseQrScannerResult {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const lockedRef = useRef(false);
  const runIdRef = useRef(0);

  const [status, setStatus] = useState<QrScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const addLog = useCallback((msg: string) => {
    if (!import.meta.env.DEV) return;
    setLogs((prev) => [...prev, msg].slice(-5));
  }, []);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
    }
    try {
      scanner.clear();
    } catch {
    }
  }, []);

  const resume = useCallback(() => {
    lockedRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) {
      void stop();
      setStatus('idle');
      setLogs([]);
      return;
    }

    lockedRef.current = false;
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;

    async function start() {
      setError(null);
      setStatus('starting');

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(INSECURE_CONTEXT);
        setStatus('error');
        return;
      }

      const container = await waitForElement(elementId);
      if (isStale()) return;
      if (!container) {
        setError('No se pudo preparar el visor de la cámara.');
        setStatus('error');
        return;
      }

      const scanner = scannerRef.current ?? new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: (viewW: number, viewH: number) => {
          const size = Math.max(140, Math.floor(Math.min(viewW, viewH) * 0.7));
          return { width: size, height: size };
        },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      };

      const handleSuccess = (decodedText: string) => {
        if (lockedRef.current) return;
        lockedRef.current = true;
        addLog(`QR leído: ${decodedText.slice(0, 40)}`);
        try {
          if ('vibrate' in navigator) navigator.vibrate(100);
        } catch {
        }
        onScanRef.current(decodedText);
      };

      try {
        addLog('Iniciando cámara trasera…');
        await scanner.start({ facingMode: 'environment' }, config, handleSuccess, () => {});
      } catch (firstErr) {
        if (isStale()) return;
        addLog('Fallback: enumerando cámaras…');
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (isStale()) return;
          if (!cameras.length) throw firstErr;
          const back = cameras.find((c) => /back|rear|trasera|environment/i.test(c.label));
          const chosen = back ?? cameras[cameras.length - 1];
          await scanner.start(chosen.id, config, handleSuccess, () => {});
        } catch (secondErr) {
          if (isStale()) return;
          console.warn('[useQrScanner] no se pudo iniciar la cámara:', secondErr);
          setError(describeCameraError(secondErr));
          setStatus('error');
          return;
        }
      }

      if (isStale()) {
        void stop();
        return;
      }
      addLog('Cámara activa, analizando.');
      setStatus('scanning');
    }

    void start();

    return () => {
      runIdRef.current++;
      void stop();
    };
  }, [enabled, elementId, stop, addLog]);

  return { status, error, logs, resume };
}
