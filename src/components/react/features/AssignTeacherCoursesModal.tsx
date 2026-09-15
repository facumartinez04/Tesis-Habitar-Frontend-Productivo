import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { getTeacherCourses, setTeacherCourses } from '../../../services/courseService';
import type { Course } from '../../../types/activity';

interface AssignTeacherCoursesModalProps {
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  availableCourses: Course[];
  onClose: () => void;
  onSaved: () => void;
}

export function AssignTeacherCoursesModal({
  teacher,
  availableCourses,
  onClose,
  onSaved,
}: AssignTeacherCoursesModalProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    getTeacherCourses(teacher.id)
      .then((assigned) => {
        setSelectedCourseIds(assigned.map((c) => c.id));
      })
      .catch(() => {

        const current = availableCourses.filter((c) => c.teacherId === teacher.id).map((c) => c.id);
        setSelectedCourseIds(current);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teacher.id, availableCourses]);

  function toggleCourse(courseId: string) {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  function handleSelectAll() {
    setSelectedCourseIds(availableCourses.map((c) => c.id));
  }

  function handleDeselectAll() {
    setSelectedCourseIds([]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await setTeacherCourses(teacher.id, selectedCourseIds);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  }

  const filteredCourses = availableCourses.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.grade && c.grade.toLowerCase().includes(q)) ||
      (c.division && c.division.toLowerCase().includes(q)) ||
      (c.shift && c.shift.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {}
        <div className="px-6 py-4 border-b border-gray-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              <Icon name="school" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-pri leading-tight">
                Asignar Aulas a Docente
              </h3>
              <p className="text-xs text-text-sec mt-0.5">
                <span className="font-semibold text-emerald-900">{teacher.name}</span> · {teacher.email}
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

        {}
        <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-950 leading-relaxed">
          <span className="mt-0.5 text-emerald-700 shrink-0">
            <Icon name="info" size={14} />
          </span>
          <p>
            El docente tendrá acceso exclusivo para gestionar lecturas, escanear el QR permanente y ver diagnósticos en las aulas que selecciones a continuación.
          </p>
        </div>

        {}
        <div className="px-6 py-3 border-b border-gray-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar aula, materia, salón..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-gray-border rounded-lg focus:outline-none focus:border-emerald-600"
            />
            <span className="absolute left-2.5 top-2 text-text-sec pointer-events-none">
              <Icon name="search" size={13} />
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
            >
              Seleccionar Todas
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-[11px] font-semibold text-text-sec hover:text-red px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Deseleccionar
            </button>
          </div>
        </div>

        {}
        <div className="p-6 overflow-y-auto flex-1 space-y-2.5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-text-sec space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full mx-auto" />
              <p>Cargando aulas del establecimiento...</p>
            </div>
          ) : availableCourses.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-sec">
              No hay aulas registradas en esta institución todavía.
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-sec">
              No se encontraron aulas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const isSelected = selectedCourseIds.includes(course.id);
              const isAnotherTeacher = course.teacherId && course.teacherId !== teacher.id;

              return (
                <div
                  key={course.id}
                  onClick={() => toggleCourse(course.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-500 shadow-xs'
                      : 'bg-white border-gray-border hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 text-emerald-700 rounded border-gray-border focus:ring-emerald-500 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-text-pri">{course.name}</span>
                      <span className="text-[11px] text-text-sec bg-surface border border-gray-border px-1.5 py-0.5 rounded">
                        {course.subject}
                      </span>
                      {course.shift && (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          {course.shift}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-text-sec flex-wrap">
                      {course.room && <span>Salón: <strong>{course.room}</strong></span>}
                      {course.grade && <span>Año/Grado: <strong>{course.grade}</strong></span>}
                      {course.division && <span>División: <strong>{course.division}</strong></span>}
                      {course.qrCode && (
                        <span className="font-mono text-[10.5px] text-emerald-900 bg-emerald-50 px-1 rounded">
                          QR: {course.qrCode}
                        </span>
                      )}
                    </div>

                    {isAnotherTeacher && !isSelected && course.teacherName && (
                      <div className="text-[10.5px] text-amber-700 mt-1">
                        Actualmente asignada a: <strong>{course.teacherName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {}
        <div className="px-6 py-4 border-t border-gray-border bg-surface/50 flex items-center justify-between gap-3">
          <div className="text-xs text-text-sec">
            Aulas asignadas seleccionadas: <strong className="text-emerald-800">{selectedCourseIds.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-text-sec hover:text-text-pri rounded-lg border border-gray-border hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={13} />
                  <span>Guardar Asignaciones</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
