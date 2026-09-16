import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { StudentQrScannerModal } from './StudentQrScannerModal';

export function TestScannerPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL('http://192.168.0.1/aula?code=AULA-TEST', {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    }).then(setQrImageUrl).catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-lg mx-auto bg-white min-h-screen text-slate-800 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Prueba Aislada del Escáner</h1>
      
      <div className="w-full bg-slate-100 p-6 rounded-xl text-center space-y-4">
        <h2 className="font-semibold text-lg">1. Generador de QR</h2>
        <p className="text-sm text-slate-500">
          Si abres esta página en tu PC, aquí tienes un QR de prueba listo para escanear con el celular.
        </p>
        {qrImageUrl && (
          <img src={qrImageUrl} alt="QR de Prueba" className="mx-auto border-4 border-white shadow-sm rounded-lg" />
        )}
      </div>

      <div className="w-full bg-emerald-50 p-6 rounded-xl text-center space-y-4 border border-emerald-100">
        <h2 className="font-semibold text-lg text-emerald-800">2. Lector de QR</h2>
        <p className="text-sm text-emerald-600">
          Abre el lector para probar la cámara y los logs.
        </p>
        <button 
          onClick={() => setIsScannerOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all active:scale-95"
        >
          Abrir Lector Ahora
        </button>
      </div>

      {scannedResult && (
        <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
          <h3 className="text-sm font-bold text-blue-800 mb-1">¡Lectura Exitosa!</h3>
          <p className="font-mono text-lg text-blue-900 bg-white p-2 rounded border border-blue-100">
            {scannedResult}
          </p>
        </div>
      )}

      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={(code, type) => {
          setScannedResult(`Tipo: ${type} | Código: ${code}`);
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
}
