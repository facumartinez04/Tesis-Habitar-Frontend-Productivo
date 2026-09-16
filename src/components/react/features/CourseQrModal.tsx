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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://habitar.lat';
    const fullUrl = `${baseUrl}/aula?code=${encodeURIComponent(qrPayload)}`;

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
      <div className="bg-white dark:bg-[#1A1E29] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 dark:border-stone-700 flex flex-col max-h-[calc(100dvh-2rem)]">
        {}
        <div className="px-5 py-3.5 bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <Icon name="kanban" size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">QR Fijo Permanente del Aula</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Cartel para proyectar o pegar en el aula física</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
          <div className="bg-white border-2 border-emerald-700/60 rounded-2xl p-4 sm:p-6 shadow-md max-w-sm w-full space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2">
              <img src="/logo.svg" alt="Habitar" className="w-6 h-6 object-contain" />
              <span className="text-base font-bold tracking-tight text-slate-900">
                Habi<span className="text-emerald-700">tar</span>
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{course.name}</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {course.subject} {course.grade ? `• ${course.grade}` : ''} {course.room ? `• ${course.room}` : ''}
              </p>
            </div>

            {}
            <div className="p-3 bg-white border border-stone-200 rounded-xl shadow-xs inline-block mx-auto">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Fijo ${course.name}`} className="w-36 h-36 sm:w-48 sm:h-48 mx-auto" />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 bg-stone-100 animate-pulse rounded-lg" />
              )}
            </div>

            {}
            <div className="space-y-0.5">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                Identificador Fijo de Aula
              </span>
              <span className="font-mono text-xs sm:text-base font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2 sm:px-3 py-1 rounded-lg inline-block border border-emerald-200 break-all">
                {course.qrCode || `AULA-${course.id.substring(0, 6).toUpperCase()}`}
              </span>
            </div>

            <p className="text-[10.5px] text-stone-400 leading-tight pt-1">
              Docentes y alumnos escanean este código fijo dentro del aula para sincronizarse y resolver actividades de lectura.
            </p>
          </div>
        </div>

        {}
        <div className="p-4 bg-stone-50 dark:bg-[#161A24] border-t border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-stone-200 transition-colors cursor-pointer"
            >
              <Icon name="printer" size={13} />
              Imprimir
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-stone-200 transition-colors cursor-pointer"
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
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="plus" size={13} />
            Subir Material a esta Aula →
          </button>
        </div>
      </div>
    </div>
  );
}
