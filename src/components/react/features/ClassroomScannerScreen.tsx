import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { HabitarLoader } from '../ui/HabitarLoader';
import { getPublicCourseInfo, bindStudentDevice } from '../../../services/courseService';
import { sessionStore } from '../../../store/sessionStore';
import type { PublicCourseInfo } from '../../../types/activity';

function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('habitar_device_id');
    if (!deviceId) {
      deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      localStorage.setItem('habitar_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_browser_fallback';
  }
}

interface BoundInfo {
  studentName: string;
  deviceId: string;
  boundAt: string;
}

export function ClassroomScannerScreen() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PublicCourseInfo | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundInfo, setBoundInfo] = useState<BoundInfo | null>(null);

  useEffect(() => {
    // 1. Extraer código QR de la URL (?code=AULA-... o /aula/AULA-...)
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    if (!code) {
      const match = window.location.pathname.match(/\/aula\/?([^/?#]+)?/);
      if (match && match[1] && match[1] !== 'aula') {
        code = decodeURIComponent(match[1]);
      }
    }

    if (!code) {
      setLoading(false);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    setQrCode(cleanCode);

    // 2. Verificar si hay sesión activa de docente o directivo
    const session = sessionStore.getState().session;
    if (session && session.user) {
      const role = session.user.role?.toUpperCase();
      if (role === 'DOCENTE') {
        setRedirecting('Reconocimos tu cuenta docente. Abriendo tu aula...');
        getPublicCourseInfo(cleanCode)
          .then((res) => {
            window.location.replace(`/docente?courseId=${res.course.id}`);
          })
          .catch(() => {
            window.location.replace('/docente');
          });
        return;
      }
      if (role === 'COORDINADOR' || role === 'DIRECTOR') {
        setRedirecting('Reconocimos tu cuenta institucional. Abriendo el aula...');
        getPublicCourseInfo(cleanCode)
          .then((res) => {
            window.location.replace(`/institucional?courseId=${res.course.id}`);
          })
          .catch(() => {
            window.location.replace('/institucional');
          });
        return;
      }
      if (role === 'ADMIN') {
        setRedirecting('Reconocimos tu cuenta de administrador...');
        window.location.replace('/admin/instituciones');
        return;
      }
    }

    // 3. Flujo Alumno: Cargar información pública del aula
    getPublicCourseInfo(cleanCode)
      .then((data) => {
        setInfo(data);
        try {
          localStorage.setItem('habitar_user_role', 'alumno');
          localStorage.setItem('habitar_last_course_id', data.course.id);
          localStorage.setItem('habitar_last_course_qr', cleanCode);

          // Verificar si este dispositivo ya está vinculado a este curso
          const localStored = localStorage.getItem(`habitar_bound_course_${data.course.id}`);
          if (localStored) {
            const parsed = JSON.parse(localStored) as BoundInfo;
            setBoundInfo(parsed);
          } else {
            // Cargar nombre anterior si existe como sugerencia
            const previousName = localStorage.getItem('habitar_student_name');
            if (previousName) {
              setStudentNameInput(previousName);
            }
          }
        } catch {
          // no-op
        }
      })
      .catch((err: any) => {
        setError(err.message || 'No se pudo cargar la información del aula.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleBindDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;

    const trimmedName = studentNameInput.trim();
    if (trimmedName.length < 3) {
      setError('Por favor ingresá tu nombre y apellido completo (mínimo 3 caracteres).');
      return;
    }

    setError(null);
    setBinding(true);

    const deviceId = getOrCreateDeviceId();

    try {
      const res = await bindStudentDevice(info.course.id, trimmedName, deviceId);
      const newBound: BoundInfo = {
        studentName: res.studentName,
        deviceId: res.deviceId,
        boundAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(`habitar_bound_course_${info.course.id}`, JSON.stringify(newBound));
        localStorage.setItem('habitar_student_name', res.studentName);
      } catch {}

      setBoundInfo(newBound);
    } catch (err: any) {
      setError(err.message || 'No se pudo vincular este dispositivo.');
    } finally {
      setBinding(false);
    }
  }

  function handleGoToActivity() {
    if (!info?.activeActivity) return;
    window.location.href = `/actividad?code=${info.activeActivity.code}`;
  }

  function handleSwitchToTeacher() {
    try {
      localStorage.removeItem('habitar_user_role');
    } catch {}
    window.location.href = '/login?switch=1';
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <HabitarLoader size="lg" message={redirecting} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <HabitarLoader size="lg" message="Verificando código de aula..." />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-pri">Código de Aula No Válido</h1>
            <p className="text-xs text-text-sec mt-1">
              {error || `El código "${qrCode || 'desconocido'}" no corresponde a un aula activa.`}
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/actividad"
              className="inline-block w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              Ir al Portal con Código PIN
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const { course, activeActivity } = info;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Barra superior de estado */}
      <div className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-md border-b border-gray-border/70 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-sec">
          <span className="text-sm">🎒</span>
          <span className="font-semibold text-text-pri">Aula Física</span>
          <span className="text-text-ter font-mono">{course.qrCode || qrCode}</span>
        </div>
        <button
          onClick={handleSwitchToTeacher}
          type="button"
          className="text-[11px] font-medium text-text-sec hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
        >
          ¿Sos docente? Iniciar sesión
        </button>
      </div>

      <Card className="w-full max-w-md p-6 space-y-5">
        {/* Cabecera del Aula */}
        <div className="text-center pb-3 border-b border-gray-border/60">
          <Badge color="green" className="mb-2">
            Aula Física Conectada
          </Badge>
          <h1 className="text-xl font-bold text-text-pri tracking-tight">{course.name}</h1>
          <p className="text-xs text-text-sec mt-0.5">
            {course.subject} {course.grade ? `• ${course.grade}` : ''} {course.division ? `"${course.division}"` : ''}
            {course.room ? ` • Salón: ${course.room}` : ''}
          </p>
          {course.institutionName && (
            <p className="text-[11px] text-text-ter mt-0.5 font-medium">{course.institutionName}</p>
          )}
        </div>

        {/* Estado de Vinculación del Alumno */}
        {boundInfo ? (
          /* Dispositivo ya vinculado con éxito (BLOQUEADO E INMUTABLE) */
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-4 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <Icon name="check" size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Dispositivo Vinculado y Verificado</span>
              </div>
              <div className="text-lg font-extrabold text-text-pri">{boundInfo.studentName}</div>
              <p className="text-[11.5px] text-text-sec leading-relaxed">
                Este celular/tablet está registrado como tu dispositivo oficial en esta aula.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-[#1A1E29] px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                  🔒 Identidad bloqueada en este equipo
                </span>
              </div>
            </div>

            {/* Actividad en Curso o Espera */}
            {activeActivity ? (
              <div className="bg-surface border border-emerald-600/30 rounded-2xl p-4 space-y-3 text-center shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Actividad de Lectura Activa
                  </span>
                  <h2 className="text-base font-bold text-text-pri">{activeActivity.name}</h2>
                  <p className="text-xs text-text-sec">
                    Código PIN: <span className="font-mono font-bold">{activeActivity.code}</span>
                    {activeActivity.endTime && ` • Disponible hasta las ${activeActivity.endTime} hs`}
                  </p>
                </div>

                <button
                  onClick={handleGoToActivity}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Comenzar Actividad Ahora</span>
                  <Icon name="arrowRight" size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-4 px-2 space-y-1.5 bg-surface rounded-xl border border-gray-border/50">
                <div className="text-2xl">⏳</div>
                <div className="text-sm font-semibold text-text-pri">Sin actividades abiertas ahora</div>
                <p className="text-xs text-text-sec max-w-xs mx-auto leading-relaxed">
                  Tu dispositivo ya está listo. Esperá la indicación de tu docente para comenzar la lectura.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Formulario de Primera Vinculación (Pide Nombre y Apellido) */
          <form onSubmit={handleBindDevice} className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-text-pri">Ingresá tu Nombre y Apellido</h2>
              <p className="text-xs text-text-sec leading-relaxed">
                Por seguridad del aula, este dispositivo quedará vinculado a tu nombre. No podrás cambiarlo después.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3 text-[12px] text-red-800 dark:text-red-300 leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-pri block">
                Nombre y Apellido del Alumno
              </label>
              <input
                type="text"
                required
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                placeholder="Ej: Mateo González"
                className="w-full px-4 py-2.5 border border-gray-border rounded-xl text-sm bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                autoFocus
              />
              <p className="text-[11px] text-text-ter">
                Escribí tu nombre tal como figura en la lista del curso.
              </p>
            </div>

            <button
              type="submit"
              disabled={binding || !studentNameInput.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {binding ? (
                <span>Vinculando dispositivo…</span>
              ) : (
                <>
                  <span>Vincular y Entrar al Aula</span>
                  <Icon name="arrowRight" size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
