import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../ui/Icon';
import type { Course } from '../../../types/activity';

interface CourseQrModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onUploadForCourse?: (course: Course) => void;
}

export function CourseQrModal({ course, isOpen, onClose, onUploadForCourse }: CourseQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!course) return;

    const qrPayload = course.qrCode || `AULA-${course.id.substring(0, 6).toUpperCase()}`;
    const fullUrl = `https://habitar.lat/aula/${qrPayload}`;

    QRCode.toDataURL(fullUrl, {
      margin: 2,
      width: 400,
      color: { dark: '#0F6E56', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Error generando QR:', err));
  }, [course]);

  if (!isOpen || !course) return null;

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Fijo-${course?.name.replace(/\s+/g, '_')}.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-border flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Icon name="kanban" size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-pri">QR Fijo Permanente del Aula</h2>
              <p className="text-[11px] text-text-sec">Cartel para proyectar o pegar en el aula física</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-ter hover:text-text-pri text-sm font-bold p-1">
            ✕
          </button>
        </div>

        {/* Cartel imprimible */}
        <div className="p-6 flex flex-col items-center justify-center bg-surface/50 text-center">
          <div className="bg-white border-2 border-emerald-700/60 rounded-2xl p-6 shadow-md max-w-sm w-full space-y-3">
            <div className="flex items-center justify-center gap-2">
              <img src="/logo.svg" alt="Habitar" className="w-6 h-6 object-contain" />
              <span className="text-base font-bold tracking-tight text-text-pri">
                Habi<span className="text-emerald-700">tar</span>
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-text-pri">{course.name}</h3>
              <p className="text-xs text-text-sec mt-0.5">
                {course.subject} {course.grade ? `• ${course.grade}` : ''} {course.room ? `• ${course.room}` : ''}
              </p>
            </div>

            {/* Código QR visual */}
            <div className="p-3 bg-white border border-gray-border rounded-xl shadow-xs inline-block mx-auto">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Fijo ${course.name}`} className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />
              )}
            </div>

            {/* Código legible */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-text-ter uppercase tracking-wider font-semibold block">
                Identificador Fijo de Aula
              </span>
              <span className="font-mono text-base font-bold tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg inline-block border border-emerald-200">
                {course.qrCode || `AULA-${course.id.substring(0, 6).toUpperCase()}`}
              </span>
            </div>

            <p className="text-[10.5px] text-text-ter leading-tight pt-1">
              Docentes y alumnos escanean este código fijo dentro del aula para sincronizarse y resolver actividades de lectura.
            </p>
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="p-4 bg-gray-50 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-border hover:bg-gray-100 rounded-lg text-xs font-semibold text-text-pri transition-colors"
            >
              <Icon name="printer" size={13} />
              Imprimir
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-border hover:bg-gray-100 rounded-lg text-xs font-semibold text-text-pri transition-colors"
            >
              <Icon name="download" size={13} />
              Descargar
            </button>
          </div>

          <button
            onClick={() => {
              if (onUploadForCourse) onUploadForCourse(course);
              else window.location.href = `/docente/actividades/nueva?courseId=${course.id}`;
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Icon name="plus" size={13} />
            Subir Material a esta Aula →
          </button>
        </div>
      </div>
    </div>
  );
}
