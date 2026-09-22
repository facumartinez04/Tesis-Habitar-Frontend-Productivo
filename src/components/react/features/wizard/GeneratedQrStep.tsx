import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Badge } from '../../ui/Badge';
import { Dot } from '../../ui/Dot';
import { Icon } from '../../ui/Icon';
import { QrBox } from '../../ui/QrBox';
import { Toast } from '../../ui/Toast';
import { useToast } from '../../../../hooks/useToast';
import { activityWizardStore, resetWizard } from '../../../../store/activityWizardStore';

export function GeneratedQrStep() {
  const wizard = useStore(activityWizardStore);
  const { message, showToast } = useToast();
  const [responses, setResponses] = useState(0);

  useEffect(() => {
    if (!wizard.generatedCode) {
      window.location.href = '/docente/actividades/nueva';
    }
  }, [wizard.generatedCode]);

  if (!wizard.generatedCode) return null;

  async function handleDownload() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const joinUrl = `${window.location.origin}/actividad?code=${encodeURIComponent(wizard.generatedCode ?? '')}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, width: 200, color: { dark: '#1A1918', light: '#FFFFFF' } });
      const qrImage = await loadImage(qrDataUrl);
      ctx.drawImage(qrImage, 50, 20, 200, 200);

      ctx.fillStyle = '#1A1918';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wizard.generatedCode ?? '', canvas.width / 2, 260);
      ctx.font = '13px sans-serif';
      ctx.fillText(wizard.name, canvas.width / 2, 290);
    }
    const link = document.createElement('a');
    link.download = `habitar_${wizard.generatedCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Imagen descargada');
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function handleProject() {
    const el = document.getElementById('qr-generated-box');
    el?.requestFullscreen?.();
  }

  function handleCreateAnother() {
    resetWizard();
    window.location.href = '/docente/actividades/nueva';
  }

  return (
    <div>
      <Toast message={message} />
      <div className="text-center mb-6">
        <Badge color="green" className="text-[11.5px] px-3.5 py-1 mb-3">
          <span className="flex items-center gap-1">
            <Icon name="check" size={11} />
            Actividad lista en menos de 90 segundos
          </span>
        </Badge>
        <div className="text-lg font-semibold text-text-pri mb-1">¡QR generado!</div>
        <div className="text-[12.5px] text-text-sec">
          {wizard.name} · {wizard.courseName} · {wizard.availableFrom} · {wizard.startTime}–{wizard.endTime}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-7 justify-center items-center sm:items-start">
        <div className="text-center" id="qr-generated-box">
          <QrBox code={wizard.generatedCode} size="lg" />
          <div className="text-[11px] text-text-ter mt-2">Código QR para proyectar o imprimir</div>
        </div>

        <div className="w-full max-w-[240px]">
          <div className="bg-surface rounded-md px-3.5 py-3 mb-3.5 border border-gray-border">
            <div className="text-[11px] text-text-ter mb-1">Código corto alternativo</div>
            <div className="font-mono text-[28px] font-medium tracking-[.16em] text-text-pri">{wizard.generatedCode}</div>
            <div className="text-[10.5px] text-text-ter mt-[3px]">Los alumnos pueden ingresarlo manualmente</div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={handleProject} className="flex items-center justify-center gap-1.5 bg-green-dark text-white rounded-[6px] py-2 text-[12.5px] font-medium">
              <Icon name="cast" size={14} />
              Proyectar en pantalla completa
            </button>
            <button onClick={handleDownload} className="flex items-center justify-center gap-1.5 bg-white border border-gray-border rounded-[6px] py-2 text-[12.5px]">
              <Icon name="download" size={14} />
              Descargar imagen
            </button>
            <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 bg-white border border-gray-border rounded-[6px] py-2 text-[12.5px]">
              <Icon name="printer" size={14} />
              Imprimir
            </button>
          </div>
          <hr className="border-gray-border my-3.5" />
          <div className="text-[11.5px] text-text-sec flex items-center"><Dot color="green" />QR válido por <strong className="ml-1">4 hs</strong></div>
          <div className="text-[11.5px] text-text-sec flex items-center mt-1"><Dot color="amber" />{responses} respuestas registradas</div>
          <button onClick={() => setResponses((r) => r + 1)} className="text-[10.5px] text-green-dark mt-1 underline">
            Simular nueva respuesta
          </button>
          <button onClick={handleCreateAnother} className="block mt-4 text-[11.5px] text-text-sec underline">
            Crear otra actividad
          </button>
        </div>
      </div>
    </div>
  );
}
