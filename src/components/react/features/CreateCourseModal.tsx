import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { createCourse } from '../../../services/courseService';
import { listInstitutionUsers, type InstitutionUser } from '../../../services/institutionUsersService';
import { sessionStore } from '../../../store/sessionStore';
import type { Course, CreateCourseInput } from '../../../types/activity';
import { t, useI18n } from '../../../i18n';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (course: Course) => void;
}

export function CreateCourseModal({ isOpen, onClose, onCreated }: CreateCourseModalProps) {
  useI18n();
  const session = sessionStore.get();
  const [teachers, setTeachers] = useState<InstitutionUser[]>([]);
  const [form, setForm] = useState<CreateCourseInput>({
    name: '',
    subject: t('Lengua y Literatura'),
    grade: t('6° Primaria'),
    division: 'A',
    room: t('Aula 1'),
    shift: 'MAÑANA',
    teacherId: session?.user.role === 'docente' ? session.user.id : undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user.institutionId && (session.user.role === 'admin' || session.user.role === 'coordinador' || session.user.role === 'director')) {
      listInstitutionUsers(session.user.institutionId)
        .then((users) => setTeachers(users.filter((u) => u.role === 'docente' && u.active)))
        .catch(() => {});
    }
  }, [session]);

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
      alert(t('Error creando el aula: ') + (err.message || t('Error desconocido')));
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
              <h2 className="text-sm font-bold text-text-pri">{t('Crear Nueva Aula / Curso')}</h2>
              <p className="text-[11px] text-text-sec">{t('Se generará un código QR fijo permanente para este salón')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-ter hover:text-text-pri text-sm font-bold p-1">
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-text-pri mb-1">
              {t('Nombre descriptivo del Aula')}{' '}<span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder={t('ej. 6° A — Lengua y Literatura')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">
                {t('Materia / Asignatura')}{' '}<span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder={t('ej. Lengua, Literatura')}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">{t('Grado / Nivel')}</label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">{t('División')}</label>
              <input
                type="text"
                placeholder={t('ej. A')}
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value.toUpperCase() })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">{t('Salón Físico')}</label>
              <input
                type="text"
                placeholder={t('ej. Aula 12')}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">{t('Turno')}</label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri"
              >
                <option value="MAÑANA">{t('Mañana')}</option>
                <option value="TARDE">{t('Tarde')}</option>
                <option value="NOCHE">{t('Noche')}</option>
              </select>
            </div>
          </div>

          {teachers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">
                {t('Docente Asignado/a a Cargo')}
              </label>
              <select
                value={form.teacherId || ''}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value || undefined })}
                className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t('-- Sin asignar / Asignar luego --')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-border text-xs rounded-lg text-text-sec hover:bg-gray-100 font-medium"
            >
              {t('Cancelar')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isSubmitting ? t('Creando Aula…') : t('Crear Aula y Generar QR')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
