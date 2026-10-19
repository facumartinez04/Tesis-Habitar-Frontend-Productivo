import { Icon } from '../ui/Icon';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import type { Course } from '../../../types/activity';

interface CourseCardsGridProps {
  courses: Course[];
  onOpen: (courseId: string) => void;
  onShowQr: (course: Course) => void;
}

const SHIFT_LABEL: Record<string, string> = { MAÑANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };

function studentsLabel(count: number | undefined): string {
  return (count ?? 0) === 1 ? 'alumno registrado' : 'alumnos registrados';
}

/** Una tarjeta por aula, con la cantidad de alumnos registrados; al entrar se ve el detalle del aula. */
export function CourseCardsGrid({ courses, onOpen, onShowQr }: CourseCardsGridProps) {
  const pagedCourses = usePagination(courses, 12, courses.length);
  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {pagedCourses.pageItems.map((course) => {
        const details = [
          course.subject,
          [course.grade, course.division ? `"${course.division}"` : ''].filter(Boolean).join(' '),
          course.shift ? `Turno ${SHIFT_LABEL[course.shift] ?? course.shift}` : '',
        ].filter(Boolean);
        return (
          <div
            key={course.id}
            className="group relative flex flex-col bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xs hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-all"
          >
            <button
              type="button"
              onClick={() => onOpen(course.id)}
              className="flex-1 text-left p-5 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 cursor-pointer"
              aria-label={`Entrar al aula ${course.name}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Icon name="school" size={20} />
                </div>
                {course.activeActivityId && (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Actividad vinculada
                  </span>
                )}
              </div>

              <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">{course.name}</div>
              {details.length > 0 && (
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{details.join(' · ')}</div>
              )}

              <div className="flex items-end justify-between gap-2 mt-5">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">
                    {course.studentsCount ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {studentsLabel(course.studentsCount)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-stone-500 dark:text-stone-400 space-y-0.5">
                  {course.room && <div>Salón {course.room}</div>}
                  {course.qrCode && <div className="font-mono font-semibold text-emerald-800 dark:text-emerald-300">{course.qrCode}</div>}
                </div>
              </div>
            </button>

            <div className="flex items-center justify-between gap-2 border-t border-stone-200/80 dark:border-stone-800 px-5 py-2.5">
              <button
                type="button"
                onClick={() => onShowQr(course)}
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
              >
                <Icon name="qrCode" size={13} />
                QR del aula
              </button>
              <button
                type="button"
                onClick={() => onOpen(course.id)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
              >
                Ver detalles
                <Icon name="arrowRight" size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
      <Pagination page={pagedCourses.page} totalPages={pagedCourses.totalPages} total={pagedCourses.total} pageSize={pagedCourses.pageSize} onChange={pagedCourses.setPage} label="aulas" />
    </>
  );
}
