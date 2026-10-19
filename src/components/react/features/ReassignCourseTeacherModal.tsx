import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { setCourseTeachers, listCourseTeachers } from '../../../services/courseService';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCourseTeachers(course.id)
      .then((assigned) => {
        setSelectedIds(assigned.map((t) => t.teacherId));
      })
      .catch(() => {
        if (course.teacherId) setSelectedIds([course.teacherId]);
      })
      .finally(() => setLoading(false));
  }, [course.id]);

  function toggleTeacher(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await setCourseTeachers(course.id, selectedIds);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar docentes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#1A1E29] rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden flex flex-col">

        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between bg-stone-50/50 dark:bg-[#161A24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              <Icon name="school" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                Asignar Docentes al Aula
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {course.name} {course.room ? `· Salón ${course.room}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-slate-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-900 dark:text-white text-xs">
              Seleccioná uno o más docentes:
            </label>

            {loading ? (
              <div className="text-xs text-stone-400 py-4 text-center">Cargando...</div>
            ) : teachers.length === 0 ? (
              <div className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700">
                No hay docentes registrados en la institución.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {teachers.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeacher(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-stone-300 dark:border-stone-600'
                        }`}
                      >
                        {isSelected && (
                          <Icon name="check" size={12} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {t.email}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const t = teachers.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-1 rounded-lg text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/60"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => toggleTeacher(id)}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-700 text-[11.5px] text-stone-500 dark:text-stone-400 leading-relaxed space-y-1">
            <div>Materia: <strong className="text-slate-900 dark:text-white">{course.subject}</strong></div>
            {course.shift && <div>Turno: <strong className="text-slate-900 dark:text-white">{course.shift}</strong></div>}
            {course.qrCode && <div>Código QR Fijo: <strong className="font-mono text-slate-900 dark:text-white">{course.qrCode}</strong></div>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-[#161A24] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-slate-900 dark:hover:text-white rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span>Guardando...</span>
            ) : (
              <>
                <Icon name="check" size={13} />
                <span>Guardar Asignación {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
