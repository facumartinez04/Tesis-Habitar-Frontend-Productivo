import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { HabitarLoader } from '../ui/HabitarLoader';
import { listCourseStudentDevices, unlinkCourseStudentDevice } from '../../../services/courseService';
import { showSuccess, showError, confirmDestructive } from '../../../lib/alerts';
import type { Course, CourseStudentDevice } from '../../../types/activity';

interface CourseDevicesModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CourseDevicesModal({ course, isOpen, onClose }: CourseDevicesModalProps) {
  const [devices, setDevices] = useState<CourseStudentDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  function loadDevices() {
    if (!course) return;
    setLoading(true);
    listCourseStudentDevices(course.id)
      .then(setDevices)
      .catch((err: any) => {
        showError('Error', err.message || 'No se pudieron cargar los dispositivos del aula.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    if (isOpen && course) {
      loadDevices();
    }
  }, [isOpen, course?.id]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => d.studentName.toLowerCase().includes(q));
  }, [devices, search]);

  async function handleUnlink(device: CourseStudentDevice) {
    if (!course) return;

    const confirmed = await confirmDestructive({
      title: `¿Desvincular dispositivo de ${device.studentName}?`,
      text: 'El alumno podrá registrar un nuevo dispositivo (celular o tablet) la próxima vez que escanee el código QR del aula.',
    });

    if (!confirmed) return;

    setUnlinkingId(device.id);
    try {
      const res = await unlinkCourseStudentDevice(course.id, device.id);
      showSuccess('Dispositivo desvinculado', res.message);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (err: any) {
      showError('Error al desvincular', err.message || 'No se pudo desvincular el dispositivo.');
    } finally {
      setUnlinkingId(null);
    }
  }

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#161A23] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-border dark:border-[#2D3342] flex flex-col max-h-[90vh]">
        {}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#1A1E29] border-b border-gray-border dark:border-[#2D3342] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl">
              <Icon name="kanban" size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-pri">Dispositivos del Aula</h2>
                <Badge color="green">{devices.length} vinculados</Badge>
              </div>
              <p className="text-xs text-text-sec mt-0.5">
                {course.name} {course.room ? `• Salón ${course.room}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-ter hover:text-text-pri text-base font-bold p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/60 dark:border-emerald-800/40 px-6 py-3 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
          <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <strong>Control de Identidad Única:</strong> Cada alumno puede tener un solo dispositivo vinculado al aula física. Si un alumno cambió de celular o tablet, presioná <strong>"Desvincular"</strong> para que pueda escanear y registrar su nuevo equipo.
          </div>
        </div>

        {}
        <div className="p-4 border-b border-gray-border/60 dark:border-[#2D3342]">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-ter">
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alumno por nombre o apellido..."
              className="w-full pl-9 pr-4 py-2 border border-gray-border dark:border-[#2D3342] rounded-xl text-xs bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 outline-none"
            />
          </div>
        </div>

        {}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <HabitarLoader size="md" message="Cargando dispositivos..." />
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Icon name="smartphone" size={30} className="mx-auto text-text-ter" />
              <div className="text-sm font-semibold text-text-pri">
                {search ? 'No se encontraron alumnos con esa búsqueda' : 'No hay dispositivos vinculados aún'}
              </div>
              <p className="text-xs text-text-sec max-w-sm mx-auto">
                {search
                  ? 'Verificá que el nombre esté bien escrito.'
                  : 'Los alumnos aparecerán aquí automáticamente cuando escaneen el código QR del aula por primera vez.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredDevices.map((d) => {
                const isUnlinking = unlinkingId === d.id;
                return (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-gray-border/80 dark:border-[#2D3342] bg-white dark:bg-[#1A1E29] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                        {d.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text-pri truncate">
                          {d.studentName}
                        </div>
                        <div className="text-[11px] text-text-ter flex flex-wrap items-center gap-2 mt-0.5">
                          <span>
                            ID: <span className="font-mono">{d.deviceId.substring(0, 10)}…</span>
                          </span>
                          <span>•</span>
                          <span>
                            Vinculado: {new Date(d.linkedAt).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleUnlink(d)}
                        disabled={isUnlinking}
                        type="button"
                        className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Icon name="trash" size={12} />
                        <span>{isUnlinking ? 'Desvinculando…' : 'Desvincular'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-[#1A1E29] border-t border-gray-border dark:border-[#2D3342] flex items-center justify-between text-xs">
          <span className="text-text-ter">
            Total: {devices.length} {devices.length === 1 ? 'dispositivo' : 'dispositivos'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-text-pri font-medium rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
