import { useEffect, useState } from 'react';
import { StudentNameFields, fullStudentName, studentNameError } from '../ui/StudentNameFields';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { HabitarLoader } from '../ui/HabitarLoader';
import { getPublicCourseInfo, bindStudentDevice } from '../../../services/courseService';
import { sessionStore } from '../../../store/sessionStore';
import type { PublicCourseInfo } from '../../../types/activity';
import { getOrCreateDeviceId } from '../../../lib/studentDevice';
import { useLiveUpdates, usePolling } from '../../../lib/realtime';
import { todayAR, whenLabel } from '../../../lib/activityDates';
import { setContextLocale, t, useI18n } from '../../../i18n';

interface BoundInfo {
  studentName: string;
  deviceId: string;
  boundAt: string;
}

export function ClassroomScannerScreen() {
  useI18n();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PublicCourseInfo | null>(null);
  useEffect(() => {
    if (info?.language) setContextLocale(info.language);
  }, [info?.language]);
  const [qrCode, setQrCode] = useState<string>('');
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [nameParts, setNameParts] = useState({ firstName: '', lastName: '' });
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundInfo, setBoundInfo] = useState<BoundInfo | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  function dbg(msg: string) {
    console.log('[AULA]', msg);
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()} ${msg}`]);
  }

  useEffect(() => {
    dbg(t('URL: {href}', { href: window.location.href }));

    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    dbg(t('code param: {code}', { code }));
    if (!code) {
      const match = window.location.pathname.match(/\/aula\/?([^/?#]+)?/);
      if (match && match[1] && match[1] !== 'aula') {
        code = decodeURIComponent(match[1]);
      }
      dbg(t('code from path: {code}', { code }));
    }

    if (!code) {
      dbg(t('No code found, stopping'));
      setLoading(false);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    setQrCode(cleanCode);
    dbg(t('cleanCode: {cleanCode}', { cleanCode }));

    let session: any = null;
    try {
      session = sessionStore.get();
      dbg(t('session: {value}', { value: session ? t('user={email} role={role}', { email: session.user?.email, role: session.user?.role }) : t('null') }));
    } catch (e: any) {
      dbg(t('sessionStore.get() error: {message}', { message: e.message }));
    }
    if (session && session.user) {
      const role = session.user.role?.toUpperCase();
      if (role === 'DOCENTE') {
        setRedirecting(t('Reconocimos tu cuenta docente. Abriendo tu aula...'));
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
        setRedirecting(t('Reconocimos tu cuenta institucional. Abriendo el aula...'));
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
        setRedirecting(t('Reconocimos tu cuenta de administrador...'));
        window.location.replace('/admin/instituciones');
        return;
      }
    }

    dbg(t('Calling getPublicCourseInfo({cleanCode})...', { cleanCode }));
    getPublicCourseInfo(cleanCode)
      .then((data) => {
        dbg(t('API OK: course={name}, activity={value}', { name: data.course.name, value: data.activeActivity?.code || 'none' }));
        setInfo(data);
        try {
          localStorage.setItem('habitar_user_role', 'alumno');
          localStorage.setItem('habitar_last_course_id', data.course.id);
          localStorage.setItem('habitar_last_course_qr', cleanCode);

          const localStored = localStorage.getItem(`habitar_bound_course_${data.course.id}`);
          if (localStored) {
            const parsed = JSON.parse(localStored) as BoundInfo;
            setBoundInfo(parsed);
          } else {

            const previousName = localStorage.getItem('habitar_student_name');
            if (previousName) {
              setStudentNameInput(previousName);
            }
          }
        } catch {

        }
      })
      .catch((err: any) => {
        dbg(t('API ERROR: {value}', { value: err.message || err }));
        setError(err.message || t('No se pudo cargar la información del aula.'));
      })
      .finally(() => {
        dbg(t('Loading done'));
        setLoading(false);
      });
  }, []);

  const refreshInfo = () => {
    if (!qrCode) return;
    getPublicCourseInfo(qrCode).then(setInfo).catch(() => undefined);
  };
  const liveConnected = useLiveUpdates(qrCode && info ? { kind: 'course', qrCode } : null, refreshInfo);
  usePolling(refreshInfo, 20_000, Boolean(qrCode && info) && !liveConnected);

  const byList = (info?.studentIdMode ?? 'NOMBRE') === 'LISTA';

  async function handleBindDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;

    const nameProblem = byList ? null : studentNameError(nameParts.firstName, nameParts.lastName);
    const trimmedName = byList ? studentNameInput.trim() : fullStudentName(nameParts.firstName, nameParts.lastName);
    if (byList && !/^\d{1,3}$/.test(trimmedName)) {
      setError(t('Ingresá sólo tu número de lista, por ejemplo 12.'));
      return;
    }
    if (nameProblem) {
      setError(nameProblem);
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

      if (info.activeActivity) {
        window.location.href = `/actividad?code=${encodeURIComponent(info.activeActivity.code)}`;
      }
    } catch (err: any) {
      setError(err.message || t('No se pudo vincular este dispositivo.'));
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

  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const debugPanel = !showDebug ? null : (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-black/90 text-green-400 text-[10px] font-mono p-2 max-h-32 overflow-y-auto">
      <div className="font-bold text-yellow-300 mb-0.5">{t('DEBUG AULA v2')}</div>
      {debugLog.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {debugLog.length === 0 && <div className="text-stone-500">{t('Esperando logs...')}</div>}
    </div>
  );

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <HabitarLoader size="lg" message={redirecting} />
        {debugPanel}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <HabitarLoader size="lg" message={t('Verificando código de aula...')} />
        {debugPanel}
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-2xl">
            <Icon name="alertTriangle" size={26} className="text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-pri">{t('Código de Aula No Válido')}</h1>
            <p className="text-xs text-text-sec mt-1">
              {error || t('El código "{value}" no corresponde a un aula activa.', { value: qrCode || t('desconocido') })}
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/actividad"
              className="inline-block w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              {t('Ir al Portal con Código PIN')}
            </a>
          </div>
        </Card>
        {debugPanel}
      </div>
    );
  }

  const { course, activeActivity } = info;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-md border-b border-gray-border/70 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-sec">
          <Icon name="backpack" size={14} />
          <span className="font-semibold text-text-pri">{t('Aula Física')}</span>
          <span className="text-text-ter font-mono">{course.qrCode || qrCode}</span>
        </div>
        <button
          onClick={handleSwitchToTeacher}
          type="button"
          className="text-[11px] font-medium text-text-sec hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
        >
          {t('¿Sos docente? Iniciar sesión')}
        </button>
      </div>

      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center pb-3 border-b border-gray-border/60">
          <Badge color="green" className="mb-2">
            {t('Aula Física Conectada')}
          </Badge>
          <h1 className="text-xl font-bold text-text-pri tracking-tight">{course.name}</h1>
          <p className="text-xs text-text-sec mt-0.5">
            {course.subject} {course.grade ? `• ${course.grade}` : ''} {course.division ? `"${course.division}"` : ''}
            {course.room ? t(' • Salón: {room}', { room: course.room }) : ''}
          </p>
          {course.institutionName && (
            <p className="text-[11px] text-text-ter mt-0.5 font-medium">{course.institutionName}</p>
          )}
        </div>

        {boundInfo ? (

          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-4 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <Icon name="check" size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t('Dispositivo Vinculado y Verificado')}</span>
              </div>
              <div className="text-lg font-extrabold text-text-pri">{boundInfo.studentName}</div>
              <p className="text-[11.5px] text-text-sec leading-relaxed">
                {t('Este celular/tablet está registrado como tu dispositivo oficial en esta aula.')}
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-[#1A1E29] px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                  <Icon name="lock" size={11} />
                  {t('Identidad bloqueada en este equipo')}
                </span>
              </div>
            </div>

            {activeActivity ? (
              <div className="bg-surface border border-emerald-600/30 rounded-2xl p-4 space-y-3 text-center shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {t('Actividad de Lectura Activa')}
                  </span>
                  <h2 className="text-base font-bold text-text-pri">{activeActivity.name}</h2>
                  <p className="text-xs text-text-sec">
                    {t('Código PIN:')}{' '}<span className="font-mono font-bold">{activeActivity.code}</span>
                    {activeActivity.endTime && t(' • Disponible hasta {whenLabel}', { whenLabel: whenLabel(activeActivity.endDate || todayAR(), activeActivity.endTime) })}
                  </p>
                </div>

                <button
                  onClick={handleGoToActivity}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('Comenzar Actividad Ahora')}</span>
                  <Icon name="arrowRight" size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-4 px-2 space-y-1.5 bg-surface rounded-xl border border-gray-border/50">
                <Icon name="clock" size={28} className="mx-auto text-amber-600 dark:text-amber-400" />
                {info.upcomingActivity ? (
                  <>
                    <div className="text-sm font-semibold text-text-pri">{info.upcomingActivity.name}</div>
                    <p className="text-xs text-text-sec max-w-xs mx-auto leading-relaxed">
                      {t('Empieza a las')}{' '}<strong>{info.upcomingActivity.startTime} h</strong>{t('. Dejá esta pantalla abierta: el botón para comenzar aparece solo.')}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-text-pri">{t('Sin actividades abiertas ahora')}</div>
                    <p className="text-xs text-text-sec max-w-xs mx-auto leading-relaxed">
                      {t('Tu dispositivo ya está listo. Dejá esta pantalla abierta: cuando tu docente abra la actividad, aparece sola.')}
                    </p>
                  </>
                )}
                <div className="inline-flex items-center gap-1.5 text-[10.5px] text-text-ter pt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                  {liveConnected ? t('Conectado en vivo') : t('Buscando actualizaciones…')}
                </div>
              </div>
            )}
          </div>
        ) : (

          <form onSubmit={handleBindDevice} className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-text-pri">
                {byList ? t('Ingresá tu número de lista') : t('Ingresá tu Nombre y Apellido')}
              </h2>
              <p className="text-xs text-text-sec leading-relaxed">
                {t('Por seguridad del aula, este dispositivo quedará vinculado a tu')}{' '}{byList ? t('número de lista') : t('nombre')}{t('. No podrás cambiarlo después.')}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3 text-[12px] text-red-800 dark:text-red-300 leading-relaxed">
                {error}
              </div>
            )}

            {byList ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-pri block">{t('Número de lista')}</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={3}
                  value={studentNameInput}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  placeholder={t('Ej: 12')}
                  className="w-full px-3 py-2.5 border border-gray-border rounded-xl text-sm bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <StudentNameFields
                firstName={nameParts.firstName}
                lastName={nameParts.lastName}
                onChange={(v) => {
                  setNameParts(v);
                  setError(null);
                }}
                inputClassName="w-full px-3 py-2.5 border border-gray-border rounded-xl text-sm bg-white dark:bg-[#1A1E29] text-text-pri focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                autoFocus
              />
            )}

            <button
              type="submit"
              disabled={binding || (byList ? !studentNameInput.trim() : !nameParts.firstName.trim() || !nameParts.lastName.trim())}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {binding ? (
                <span>{t('Vinculando dispositivo…')}</span>
              ) : (
                <>
                  <span>{t('Vincular y Entrar al Aula')}</span>
                  <Icon name="arrowRight" size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </Card>
      {debugPanel}
    </div>
  );
}
