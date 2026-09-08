import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { createCourse } from '../../../services/courseService';
import type { Course, CreateCourseInput } from '../../../types/activity';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (course: Course) => void;
}

export function CreateCourseModal({ isOpen, onClose, onCreated }: CreateCourseModalProps) {
  const [form, setForm] = useState<CreateCourseInput>({
    name: '',
    subject: 'Lengua y Literatura',
    grade: '6° Primaria',
    division: 'A',
    room: 'Aula 1',
    shift: 'MAÑANA',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) return;

    setIsSubmitting(true);
    try {
      const course = await createCourse(form);
      onCreated(course);
      onClose();
    } catch (err: any) {
      alert('Error creando el aula: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-border">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Icon name="plus" size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-pri">Crear Nueva Aula / Curso</h2>
              <p className="text-[11px] text-text-sec">Se generará un código QR fijo permanente para este salón</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-ter hover:text-text-pri text-sm font-bold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-text-pri mb-1">
              Nombre descriptivo del Aula <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="ej. 6° A — Lengua y Literatura"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">
                Materia / Asignatura <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="ej. Lengua, Literatura"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">Grado / Nivel</label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
              >
                <option value="4° Primaria">4° Primaria</option>
                <option value="5° Primaria">5° Primaria</option>
                <option value="6° Primaria">6° Primaria</option>
                <option value="1° Secundaria">1° Secundaria</option>
                <option value="2° Secundaria">2° Secundaria</option>
                <option value="3° Secundaria">3° Secundaria</option>
                <option value="4° Secundaria">4° Secundaria</option>
                <option value="5° Secundaria">5° Secundaria</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">División</label>
              <input
                type="text"
                placeholder="ej. A"
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value.toUpperCase() })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">Salón Físico</label>
              <input
                type="text"
                placeholder="ej. Aula 12"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">Turno</label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri"
              >
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-border text-xs rounded-lg text-text-sec hover:bg-gray-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isSubmitting ? 'Creando Aula…' : 'Crear Aula y Generar QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
