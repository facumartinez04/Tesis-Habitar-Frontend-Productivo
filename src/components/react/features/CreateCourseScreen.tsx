import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { HabitarLoader } from '../ui/HabitarLoader';
import { createCourse } from '../../../services/courseService';
import { listInstitutionUsers, type InstitutionUser } from '../../../services/institutionUsersService';
import type { CreateCourseInput } from '../../../types/activity';
import { t, useI18n } from '../../../i18n';

export function CreateCourseScreen() {
  useI18n();
  const session = useAuthGuard(['coordinador', 'admin']);
  const [teachers, setTeachers] = useState<InstitutionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, showToast } = useToast();

  const [form, setForm] = useState<CreateCourseInput>({
    name: '',
    subject: t('Lengua y Literatura'),
    grade: t('6° Primaria'),
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
    return <HabitarLoader size="lg" message={t('Cargando datos...')} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) return;

    setIsSubmitting(true);
    try {
      await createCourse(form);
      window.location.href = '/institucional/aulas';
    } catch (err: any) {
      showToast(t('Error creando el aula: ') + (err.message || t('Error desconocido')));
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
          {t('Volver a Aulas')}
        </a>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('Crear Nueva Aula')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {t('Se generará un código QR fijo permanente para este salón')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-2xl p-6 space-y-5 shadow-xs">

          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
              {t('Nombre descriptivo del Aula')}{' '}<span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder={t('ej. 6° A — Lengua y Literatura')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                {t('Materia / Asignatura')}{' '}<span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder={t('ej. Lengua, Literatura')}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                {t('Grado / Nivel')}
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              >
                <option value="4° Primaria">{t('4° Primaria')}</option>
                <option value="5° Primaria">{t('5° Primaria')}</option>
                <option value="6° Primaria">{t('6° Primaria')}</option>
                <option value="1° Secundaria">{t('1° Secundaria')}</option>
                <option value="2° Secundaria">{t('2° Secundaria')}</option>
                <option value="3° Secundaria">{t('3° Secundaria')}</option>
                <option value="4° Secundaria">{t('4° Secundaria')}</option>
                <option value="5° Secundaria">{t('5° Secundaria')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                {t('División')}
              </label>
              <input
                type="text"
                placeholder={t('ej. A')}
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value.toUpperCase() })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                {t('Salón Físico')}
              </label>
              <input
                type="text"
                placeholder={t('ej. Aula 12')}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                {t('Turno')}
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              >
                <option value="MAÑANA">{t('Mañana')}</option>
                <option value="TARDE">{t('Tarde')}</option>
                <option value="NOCHE">{t('Noche')}</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
              {t('Asignar Docente a Cargo')}
            </label>
            {teachers.length > 0 ? (
              <select
                value={form.teacherId || ''}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value || undefined })}
                className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-stone-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all"
              >
                <option value="">{t('-- Sin asignar / Asignar luego --')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-stone-400 dark:text-stone-500 py-2">
                {t('No hay docentes registrados en la institución. Podés asignar uno después.')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <a
            href="/institucional/aulas"
            className="px-4 py-2.5 border border-stone-200 dark:border-stone-700 text-xs rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium transition-colors"
          >
            {t('Cancelar')}
          </a>
          <button
            type="submit"
            disabled={isSubmitting || !form.name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            {isSubmitting ? (
              t('Creando Aula...')
            ) : (
              <>
                <Icon name="check" size={14} />
                {t('Crear Aula y Generar QR')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
