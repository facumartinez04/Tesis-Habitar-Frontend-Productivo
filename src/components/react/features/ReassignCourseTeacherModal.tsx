import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { assignCourseTeacher } from '../../../services/courseService';
import type { Course } from '../../../types/activity';
import type { InstitutionUser } from '../../../services/institutionUsersService';

interface ReassignCourseTeacherModalProps {
  course: Course;
  teachers: InstitutionUser[];
  onClose: () => void;
  onSaved: () => void;
}

export function ReassignCourseTeacherModal({
  course,
  teachers,
  onClose,
  onSaved,
}: ReassignCourseTeacherModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(course.teacherId || (teachers[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedTeacherId) return;
    setSaving(true);
    setError(null);
    try {
      await assignCourseTeacher(course.id, selectedTeacherId);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reasignar docente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-border shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              <Icon name="school" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-pri leading-tight">
                Asignar Docente al Aula
              </h3>
              <p className="text-xs text-text-sec mt-0.5">
                {course.name} {course.room ? `· Salón ${course.room}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-sec hover:text-text-pri hover:bg-surface transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-text-pri text-xs">
              Seleccionar Docente a Cargo:
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full bg-white border border-gray-border rounded-xl p-2.5 text-xs text-text-pri focus:border-emerald-600 focus:outline-none"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-gray-border/70 text-[11.5px] text-text-sec leading-relaxed space-y-1">
            <div>Materia: <strong>{course.subject}</strong></div>
            {course.shift && <div>Turno: <strong>{course.shift}</strong></div>}
            {course.qrCode && <div>Código QR Fijo: <strong className="font-mono">{course.qrCode}</strong></div>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-border bg-surface/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-text-sec hover:text-text-pri rounded-lg border border-gray-border hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedTeacherId}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <span>Asignando...</span>
            ) : (
              <>
                <Icon name="check" size={13} />
                <span>Confirmar Asignación</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
