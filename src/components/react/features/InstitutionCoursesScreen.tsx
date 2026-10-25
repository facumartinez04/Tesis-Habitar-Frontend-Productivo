import { useEffect, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { TableWrap } from '../ui/TableWrap';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { HabitarLoader } from '../ui/HabitarLoader';
import { listMyCourses } from '../../../services/courseService';
import { listInstitutionUsers, type InstitutionUser } from '../../../services/institutionUsersService';
import { ReassignCourseTeacherModal } from './ReassignCourseTeacherModal';
import { CourseQrModal } from './CourseQrModal';
import type { Course } from '../../../types/activity';
import { t, useI18n } from '../../../i18n';

export function InstitutionCoursesScreen() {
  useI18n();
  const session = useAuthGuard(['coordinador', 'admin']);
  const [courses, setCourses] = useState<Course[]>([]);
  const pagedCourses = usePagination(courses, 15, null);
  const [teachers, setTeachers] = useState<InstitutionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigningCourse, setReassigningCourse] = useState<Course | null>(null);
  const [qrCourse, setQrCourse] = useState<Course | null>(null);
  const { message, showToast } = useToast();

  async function loadData() {
    if (!session) return;
    setLoading(true);
    try {
      const [courseList, userList] = await Promise.all([
        listMyCourses(),
        listInstitutionUsers(session.user.institutionId),
      ]);
      setCourses(courseList);
      setTeachers(userList.filter((u) => u.role === 'docente' && u.active));
    } catch {
      showToast(t('Error al cargar las aulas'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [session]);

  if (!session || loading) {
    return <HabitarLoader size="lg" message={t('Cargando aulas de la institución...')} />;
  }

  return (
    <div>
      <Toast message={message} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('Gestión de Aulas')}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t('Creá, asigná docentes y gestioná las aulas de tu institución')}
          </p>
        </div>
        <a
          href="/institucional/aulas/nueva"
          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs transition-all"
        >
          <Icon name="plus" size={14} />
          <span>{t('Crear Nueva Aula')}</span>
        </a>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1E29] border border-stone-200 dark:border-stone-700 rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <Icon name="school" size={28} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {t('Aún no hay aulas creadas')}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
            {t('Creá la primera aula de tu institución para generar su código QR y asignar un docente.')}
          </p>
          <a
            href="/institucional/aulas/nueva"
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition-all"
          >
            <Icon name="plus" size={13} />
            {t('Crear primera aula')}
          </a>
        </div>
      ) : (
        <>
        <TableWrap>
          <thead>
            <tr className="bg-stone-50 dark:bg-[#161A24] border-b border-stone-200 dark:border-stone-800">
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Aula')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Materia')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Salón / Turno')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Docente')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Alumnos')}</th>
              <th className="text-left text-xs text-stone-600 dark:text-stone-400 font-bold px-4 py-3">{t('Acciones')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
            {pagedCourses.pageItems.map((course) => (
              <tr key={course.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">{course.name}</div>
                  {course.qrCode && (
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                      {course.qrCode}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-300">{course.subject}</td>
                <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-300">
                  {course.room || '—'}
                  {course.shift && <span className="text-stone-400"> · {course.shift}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      {course.teacherName || t('Sin asignar')}
                    </span>
                    <button
                      onClick={() => setReassigningCourse(course)}
                      className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors cursor-pointer"
                      title={t('Reasignar docente')}
                    >
                      <Icon name="edit" size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-stone-700 dark:text-stone-300">
                  {course.studentsCount ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQrCourse(course)}
                      className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                      title={t('Ver y descargar QR')}
                    >
                      <Icon name="qrCode" size={11} />
                      {t('QR')}
                    </button>
                    <a
                      href={`/docente/actividades/nueva?courseId=${course.id}`}
                      className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-2 py-1 text-[11px] font-semibold shadow-2xs transition-colors"
                    >
                      <Icon name="fileText" size={11} />
                      {t('Subir Material')}
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pagination page={pagedCourses.page} totalPages={pagedCourses.totalPages} total={pagedCourses.total} pageSize={pagedCourses.pageSize} onChange={pagedCourses.setPage} label={t('aulas')} />
        </>
      )}

      {reassigningCourse && (
        <ReassignCourseTeacherModal
          course={reassigningCourse}
          teachers={teachers}
          onClose={() => setReassigningCourse(null)}
          onSaved={() => {
            setReassigningCourse(null);
            loadData();
            showToast(t('Docente reasignado correctamente'));
          }}
        />
      )}

      <CourseQrModal
        course={qrCourse}
        isOpen={Boolean(qrCourse)}
        onClose={() => setQrCourse(null)}
      />
    </div>
  );
}
