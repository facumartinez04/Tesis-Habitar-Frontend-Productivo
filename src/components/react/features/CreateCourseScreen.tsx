import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { HabitarLoader } from '../ui/HabitarLoader';
import { createCourse } from '../../../services/courseService';
import { listInstitutionUsers, type InstitutionUser } from '../../../services/institutionUsersService';
import type { CreateCourseInput } from '../../../types/activity';

export function CreateCourseScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const [teachers, setTeachers] = useState<InstitutionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, showToast } = useToast();

  const [form, setForm] = useState<CreateCourseInput>({
    name: '',
    subject: 'Lengua y Literatura',
    grade: '6° Primaria',
    division: 'A',
    room: '',
    shift: 'MAÑANA',
    teacherId: undefined,
  });

  useEffect(() => {
    if (!session) return;
    listInstitutionUsers(session.user.institutionId)
      .then((users) => {
        setTeachers(users.filter((u) => u.role === 'docente' && u.active));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (!session || loading) {
    return <HabitarLoader size="lg" message="Cargando datos..." />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) return;

    setIsSubmitting(true);
    try {
      await createCourse(form);
      window.location.href = '/institucional/aulas';
    } catch (err: any) {
      showToast('Error creando el aula: ' + (err.message || 'Error desconocido'));
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Toast message={message} />

      <div className="mb-6">
        <a
          href="/institucional/aulas"
          className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-emerald-700 transition-colors mb-3"
        >
          <Icon name="arrowLeft" size={13} />
          Volver a Aulas
        </a>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Crear Nueva Aula
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Se generará un código QR fijo permanente para este salón
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-2xl p-6 space-y-5 shadow-xs">

          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
              Nombre descriptivo del Aula <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="ej. 6° A — Lengua y Literatura"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                Materia / Asignatura <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="ej. Lengua, Literatura"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                Grado / Nivel
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                División
              </label>
              <input
                type="text"
                placeholder="ej. A"
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value.toUpperCase() })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                Salón Físico
              </label>
              <input
                type="text"
                placeholder="ej. Aula 12"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                Turno
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              >
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
              Asignar Docente a Cargo
            </label>
            {teachers.length > 0 ? (
              <select
                value={form.teacherId || ''}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value || undefined })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              >
                <option value="">-- Sin asignar / Asignar luego --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-stone-400 dark:text-stone-500 py-2">
                No hay docentes registrados en la institución. Podés asignar uno después.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <a
            href="/institucional/aulas"
            className="px-4 py-2.5 border border-stone-200 dark:border-stone-700 text-xs rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium transition-colors"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={isSubmitting || !form.name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {isSubmitting ? (
              'Creando Aula...'
            ) : (
              <>
                <Icon name="check" size={14} />
                Crear Aula y Generar QR
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
