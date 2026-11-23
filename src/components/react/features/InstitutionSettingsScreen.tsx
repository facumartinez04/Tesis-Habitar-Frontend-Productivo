import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { TableWrap } from '../ui/TableWrap';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useToast } from '../../../hooks/useToast';
import { getInstitutionById, updateInstitutionConfig, testAiConfig } from '../../../services/institutionService';
import { getAiUsage, type AiUsageSnapshot } from '../../../services/aiUsageService';
import {
  inviteInstitutionUser,
  invitationEmailWarning,
  listInstitutionUsers,
  setInstitutionUserActive,
  updateInstitutionUserRole,
  type InstitutionUser,
} from '../../../services/institutionUsersService';
import { getRetentionPolicy, purgeExpiredData, updateRetentionPolicy, type RetentionPolicy } from '../../../services/complianceService';
import { listMyCourses } from '../../../services/courseService';
import { AssignTeacherCoursesModal } from './AssignTeacherCoursesModal';
import { confirmDestructive, showError } from '../../../lib/alerts';
import type { ComprehensionAxis, EducationLevel, Institution, AiProvider, AiKeySource } from '../../../types/institution';
import type { Course } from '../../../types/activity';
import type { Role } from '../../../types/auth';
import { LOCALES, setContextLocale, t, useI18n, intlLocale, type Locale } from '../../../i18n';
import { sessionStore } from '../../../store/sessionStore';
import { HelpTip } from '../ui/HelpTip';

const ROLE_LABEL: Record<Role, string> = { docente: 'Docente', coordinador: 'Coordinador/a',
  director: 'Director/a', admin: 'Admin' };
const LEVEL_LABEL: Record<EducationLevel, string> = { primario: 'Primario', secundario: 'Secundario' };
const AXIS_LABEL: Record<ComprehensionAxis, string> = { literal: 'Literal', inferencial: 'Inferencial', critico: 'Crítico' };

export function InstitutionSettingsScreen() {
  useI18n();
  const session = useAuthGuard(['coordinador', 'admin']);
  const { message, kind: toastKind, showToast } = useToast();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSnapshot | null>(null);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assigningTeacher, setAssigningTeacher] = useState<InstitutionUser | null>(null);
  const [retention, setRetention] = useState<RetentionPolicy | null>(null);

  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [axes, setAxes] = useState<ComprehensionAxis[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const [aiProvider, setAiProvider] = useState<AiProvider>('deepseek');
  const [aiKeySource, setAiKeySource] = useState<AiKeySource>('platform');
  const [aiCustomApiKey, setAiCustomApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [studentIdMode, setStudentIdMode] = useState<'lista' | 'nombre'>('nombre');
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>('es');
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [readingMax, setReadingMax] = useState(5000);
  const [savingReadingMax, setSavingReadingMax] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(60);
  const [alertEmailsEnabled, setAlertEmailsEnabled] = useState(true);
  const [savingStudents, setSavingStudents] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'docente' as Role });
  const [inviting, setInviting] = useState(false);

  const [retentionMonths, setRetentionMonths] = useState(24);
  const [purging, setPurging] = useState(false);

  async function refresh() {
    if (!session) return;
    const institutionId = session.user.institutionId;
    void getAiUsage(institutionId).then(setAiUsage).catch(() => null);
    const [inst, userList, retentionPolicy, courseList] = await Promise.all([
      getInstitutionById(institutionId),
      listInstitutionUsers(institutionId),
      getRetentionPolicy(institutionId),
      listMyCourses().catch(() => [] as Course[]),
    ]);
    setInstitution(inst);
    setUsers(userList);
    setRetention(retentionPolicy);
    setRetentionMonths(retentionPolicy.retentionMonths);
    setCourses(courseList);
  }

  useEffect(() => {
    refresh();
  }, [session]);

  useEffect(() => {
    if (institution) {
      setLevels(institution.levels);
      setAxes(institution.enabledAxes);
      setAiProvider(institution.aiProvider ?? 'deepseek');
      setAiKeySource(institution.aiKeySource ?? 'platform');
      setAiModel(institution.aiModel ?? (institution.aiProvider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat'));
      setAiCustomApiKey('');
      setTestResult(null);
      setStudentIdMode(institution.studentIdMode);
      setDefaultLanguage(institution.defaultLanguage);
      setReadingMax(institution.readingMaxChars);
      setAlertThreshold(institution.alertThreshold);
      setAlertEmailsEnabled(institution.alertEmailsEnabled);
    }
  }, [institution]);

  async function handleSaveLanguage() {
    if (!session) return;
    setSavingLanguage(true);
    try {
      const updated = await updateInstitutionConfig(session.user.institutionId, { defaultLanguage });
      setInstitution(updated);
      const current = sessionStore.get();
      if (current) sessionStore.set({ ...current, institutionLanguage: updated.defaultLanguage });
      setContextLocale(updated.defaultLanguage);
      showToast(t('Idioma de la institución guardado'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Error al guardar la configuración'), 'error');
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleSaveReadingMax() {
    if (!session) return;
    if (!Number.isInteger(readingMax) || readingMax < 500 || readingMax > 50000) {
      showToast(t('El máximo tiene que estar entre 500 y 50.000 caracteres'));
      return;
    }
    setSavingReadingMax(true);
    try {
      const updated = await updateInstitutionConfig(session.user.institutionId, { readingMaxChars: readingMax });
      setInstitution(updated);
      const current = sessionStore.get();
      if (current) sessionStore.set({ ...current, readingMaxChars: updated.readingMaxChars });
      showToast(t('Largo máximo de las lecturas guardado'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Error al guardar la configuración'), 'error');
    } finally {
      setSavingReadingMax(false);
    }
  }

  async function handleSaveStudentsAndAlerts() {
    if (!session) return;
    setSavingStudents(true);
    try {
      const updated = await updateInstitutionConfig(session.user.institutionId, {
        studentIdMode,
        alertThreshold,
        alertEmailsEnabled,
      });
      setInstitution(updated);
      showToast(t('Identificación de alumnos y alertas guardadas'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Error al guardar la configuración'), 'error');
    } finally {
      setSavingStudents(false);
    }
  }

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSaveConfig() {
    if (!session) return;
    setSavingConfig(true);
    try {
      const updated = await updateInstitutionConfig(session.user.institutionId, {
        levels,
        enabledAxes: axes,
        aiProvider,
        aiKeySource,
        aiCustomApiKey: aiCustomApiKey.trim() ? aiCustomApiKey.trim() : undefined,
        aiModel: aiModel.trim() ? aiModel.trim() : undefined,
      });
      setInstitution(updated);
      setAiCustomApiKey('');
      showToast(t('Configuración institucional e IA guardada'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Error al guardar la configuración'), 'error');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleTestAi() {
    if (!session || !institution) return;
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await testAiConfig(session.user.institutionId, {
        provider: aiProvider,
        keySource: aiKeySource,
        apiKey: aiCustomApiKey.trim() || undefined,
        model: aiModel.trim() || undefined,
      });
      setTestResult(res);
      if (res.success) {
        showToast(t('¡Prueba de conexión exitosa con la IA!'));
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : t('Fallo en la prueba de conexión'),
      });
    } finally {
      setTestingAi(false);
    }
  }

  async function handleInvite() {
    if (!session || !inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const { email } = await inviteInstitutionUser(session.user.institutionId, { ...inviteForm, provider: 'google' });
      setInviteForm({ name: '', email: '', role: 'docente' });
      const warning = invitationEmailWarning(email);
      if (warning) showToast(warning, 'error');
      else showToast(t('Usuario invitado'));
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('No se pudo invitar al usuario'), 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(user: InstitutionUser) {
    if (!session) return;
    if (user.active) {
      const confirmed = await confirmDestructive({
        title: t('¿Desactivar a {name}?', { name: user.name }),
        text: t('Va a perder el acceso a Habitar hasta que lo vuelvas a activar.'),
        confirmButtonText: t('Sí, desactivar'),
      });
      if (!confirmed) return;
    }
    try {
      await setInstitutionUserActive(session.user.institutionId, user.id, !user.active);
      refresh();
    } catch (err) {
      showError(t('No se pudo actualizar el usuario'), err instanceof Error ? err.message : undefined);
    }
  }

  async function handleRoleChange(user: InstitutionUser, role: Role) {
    if (!session) return;
    await updateInstitutionUserRole(session.user.institutionId, user.id, role);
    refresh();
  }

  async function handleSaveRetention() {
    if (!session) return;
    await updateRetentionPolicy(session.user.institutionId, retentionMonths);
    showToast(t('Política de retención actualizada'));
    refresh();
  }

  async function handlePurge() {
    if (!session) return;
    const confirmed = await confirmDestructive({
      title: t('¿Purgar datos vencidos?'),
      text: t('Se van a eliminar de forma permanente los alumnos dados de alta hace más de {retentionMonths} meses. Esta acción no se puede deshacer.', { retentionMonths }),
      confirmButtonText: t('Sí, purgar'),
    });
    if (!confirmed) return;

    setPurging(true);
    try {
      const result = await purgeExpiredData(session.user.institutionId);
      showToast(t('Purga completada: {purgedStudentCount} alumnos eliminados', { purgedStudentCount: result.purgedStudentCount }));
      refresh();
    } finally {
      setPurging(false);
    }
  }

  if (!session) {
    return (
      <div className="space-y-5">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast message={message} kind={toastKind} />
      <div className="text-lg font-semibold text-text-pri tracking-tight">{t('Configuración institucional')}</div>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">{t('CU-05-06 · Niveles y ejes de comprensión habilitados')}</div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">{t('Niveles')}</div>
            <div className="flex gap-2">
              {(['primario', 'secundario'] as EducationLevel[]).map((level) => (
                <label key={level} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={levels.includes(level)} onChange={() => toggle(levels, level, setLevels)} />
                  {t(LEVEL_LABEL[level])}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">{t('Ejes de comprensión')}</div>
            <div className="flex gap-2">
              {(['literal', 'inferencial', 'critico'] as ComprehensionAxis[]).map((axis) => (
                <label key={axis} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={axes.includes(axis)} onChange={() => toggle(axes, axis, setAxes)} />
                  {t(AXIS_LABEL[axis])}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSaveConfig} disabled={savingConfig} className="mt-3 bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          {savingConfig ? t('Guardando…') : t('Guardar configuración')}
        </button>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">{t('Idioma de la institución')}</div>
        <div className="text-[11.5px] text-text-sec mb-3 leading-relaxed">
          {t('Es el idioma con el que los alumnos ven las actividades y el aula, el que usan los correos de invitación y alertas, y el que tiene la plataforma para quien todavía no eligió uno. Cada docente puede cambiar el suyo con el selector de la barra superior.')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LOCALES.map((option) => (
            <label key={option.id} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
              <input type="radio" name="defaultLanguage" checked={defaultLanguage === option.id} onChange={() => setDefaultLanguage(option.id)} />
              {option.label}
            </label>
          ))}
          <button onClick={handleSaveLanguage} disabled={savingLanguage} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {savingLanguage ? t('Guardando…') : t('Guardar idioma')}
          </button>
        </div>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1 flex items-center gap-1.5">
          {t('Largo máximo de las lecturas')}
          <HelpTip text={t('Cantidad máxima de caracteres (con espacios) que puede tener el texto de una actividad. Un texto de 5.000 caracteres son unas 800 palabras.')} />
        </div>
        <div className="text-[11.5px] text-text-sec mb-3 leading-relaxed">
          {t('Los docentes no van a poder generar ni publicar una actividad con un texto más largo. Por defecto son 5.000 caracteres.')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={500}
            max={50000}
            step={100}
            value={readingMax}
            onChange={(e) => setReadingMax(Number(e.target.value))}
            aria-label={t('Largo máximo de las lecturas')}
            className="w-32 border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] bg-white dark:bg-[#1A1E29]"
          />
          <span className="text-[12px] text-text-sec">{t('caracteres')}</span>
          <button onClick={handleSaveReadingMax} disabled={savingReadingMax} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {savingReadingMax ? t('Guardando…') : t('Guardar largo máximo')}
          </button>
        </div>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">{t('Identificación de los alumnos')}</div>
        <div className="text-[11.5px] text-text-sec mb-3 leading-relaxed">
          {t('Los alumnos no crean cuenta. Por defecto se identifican con su nombre y apellido, que es lo que ve el docente en el panel y en los resultados. Si la institución prefiere no guardar nombres de menores, puede pedir sólo el número de lista: el docente sabe quién es quién por su lista del curso.')}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { value: 'nombre', label: t('Nombre y apellido') },
            { value: 'lista', label: t('Sólo número de lista') },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
              <input type="radio" name="studentIdMode" checked={studentIdMode === opt.value} onChange={() => setStudentIdMode(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="text-[12.5px] font-medium mb-1">{t('Alertas de rendimiento (CU-03-03)')}</div>
        <div className="text-[11.5px] text-text-sec mb-2 leading-relaxed">
          {t('Cuando el promedio de un curso en un eje, en sus últimas cinco actividades, queda debajo del umbral, Habitar genera una alerta. Más de 15 puntos debajo, la alerta es crítica.')}
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <label className="flex items-center gap-2 text-[12px]">
            {t('Umbral')}
            <input
              type="number"
              min={0}
              max={100}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-[70px] px-2 py-1 border border-gray-border rounded-md text-[12px] bg-white"
            />
            {t('puntos')}
          </label>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
            <input type="checkbox" checked={alertEmailsEnabled} onChange={(e) => setAlertEmailsEnabled(e.target.checked)} />
            {t('Avisar por correo a la coordinación')}
          </label>
        </div>
        <button
          onClick={handleSaveStudentsAndAlerts}
          disabled={savingStudents}
          className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {savingStudents ? t('Guardando…') : t('Guardar identificación y alertas')}
        </button>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
          <div>
            <div className="text-[13px] font-semibold text-text-pri flex items-center gap-1.5">
              <Icon name="sparkles" size={14} className="text-green-dark" />
              {t('Inteligencia Artificial y Modelos Pedagógicos')}
            </div>
            <div className="text-[11.5px] text-text-sec mt-0.5">
              {t('Motor para la generación de actividades de comprensión lectora (ejes literal, inferencial y crítico).')}
            </div>
          </div>
          <Badge color={aiProvider === 'openai' ? 'blue' : 'green'}>
            {aiProvider === 'openai' ? t('OpenAI (ChatGPT)') : 'DeepSeek'} · {aiKeySource === 'custom' ? t('Clave Propia (BYOK)') : t('Clave Habitar')}
          </Badge>
        </div>

        {aiUsage && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-text-sec bg-surface border border-gray-border rounded-lg px-3 py-2 mt-1">
            <span>
              {t('Gasto de IA este mes:')}{' '}
              <strong className="text-text-pri tabular-nums">
                {t('US$')}{' '}{(aiUsage.spentUsd ?? 0).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </strong>
            </span>
            <span>
              {t('Tope mensual:')}{' '}
              <strong className="text-text-pri tabular-nums">
                {aiUsage.budgetUsd === null || aiUsage.budgetUsd === undefined ? t('sin tope') : `US$ ${aiUsage.budgetUsd.toLocaleString(intlLocale())}`}
              </strong>
            </span>
            <span>
              {t('Generaciones:')}{' '}<strong className="text-text-pri tabular-nums">{aiUsage.used}</strong>{' '}{t('de {quota}', { quota: aiUsage.quota })}
            </span>
            {aiUsage.overBudget && <span className="text-red-700 dark:text-red-300 font-semibold">{t('Tope alcanzado: la IA queda pausada hasta el mes que viene')}</span>}
          </div>
        )}

        <div className="space-y-4 pt-1">
          <div>
            <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider mb-2">
              {t('1. Proveedor de Inteligencia Artificial')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAiProvider('deepseek');
                  if (!aiModel || aiModel.startsWith('gpt')) setAiModel('deepseek-chat');
                  setTestResult(null);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  aiProvider === 'deepseek'
                    ? 'border-green-dark bg-green-50/50 shadow-sm'
                    : 'border-gray-border bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[13px] text-text-pri">DeepSeek</span>
                  {aiProvider === 'deepseek' && (
                    <span className="text-[10.5px] bg-green-dark text-white px-2 py-0.5 rounded-full font-medium">{t('Activo')}</span>
                  )}
                </div>
                <p className="text-[11.5px] text-text-sec">
                  {t('Modelo con alta capacidad de razonamiento y comprensión textual en español rioplatense.')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiProvider('openai');
                  if (!aiModel || aiModel.startsWith('deepseek')) setAiModel('gpt-4o-mini');
                  setTestResult(null);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  aiProvider === 'openai'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-border bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[13px] text-text-pri">{t('OpenAI (ChatGPT)')}</span>
                  {aiProvider === 'openai' && (
                    <span className="text-[10.5px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">{t('Activo')}</span>
                  )}
                </div>
                <p className="text-[11.5px] text-text-sec">
                  {t('Modelos GPT-4o-mini y GPT-4o reconocidos mundialmente por velocidad y rigor pedagógico.')}
                </p>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider mb-2">
              {t('2. Origen de la Clave de API (Key Source)')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  aiKeySource === 'platform'
                    ? 'border-green-dark bg-green-50/40'
                    : 'border-gray-border bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="keySource"
                  checked={aiKeySource === 'platform'}
                  onChange={() => {
                    setAiKeySource('platform');
                    setTestResult(null);
                  }}
                  className="mt-0.5 text-green-dark focus:ring-green-dark"
                />
                <div>
                  <div className="font-medium text-[12.5px] text-text-pri">{t('Clave Central de Habitar (Servidor)')}</div>
                  <div className="text-[11.5px] text-text-sec mt-0.5">
                    {t('Utiliza la infraestructura central. El consumo se descuenta de la cuota mensual del plan contratado.')}
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  aiKeySource === 'custom'
                    ? 'border-green-dark bg-green-50/40'
                    : 'border-gray-border bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="keySource"
                  checked={aiKeySource === 'custom'}
                  onChange={() => {
                    setAiKeySource('custom');
                    setTestResult(null);
                  }}
                  className="mt-0.5 text-green-dark focus:ring-green-dark"
                />
                <div>
                  <div className="font-medium text-[12.5px] text-text-pri">{t('Clave Propia de la Escuela (BYOK)')}</div>
                  <div className="text-[11.5px] text-text-sec mt-0.5">
                    {t('Tu colegio usa su propia API Key de OpenAI o DeepSeek. No consume cuotas de la plataforma Habitar.')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {aiKeySource === 'custom' && (
            <div className="bg-surface p-3.5 rounded-lg border border-gray-border space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-medium text-text-pri">
                    {t('API Key de')}{' '}{aiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'}
                  </label>
                  {institution?.hasCustomApiKey && (
                    <span className="text-[10.5px] text-text-sec font-mono bg-white px-2 py-0.5 rounded border border-gray-border">
                      {t('Clave guardada: {aiCustomApiKeyMasked}', { aiCustomApiKeyMasked: institution.aiCustomApiKeyMasked })}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiCustomApiKey}
                    onChange={(e) => {
                      setAiCustomApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder={
                      institution?.hasCustomApiKey
                        ? t('Dejá vacío para conservar la clave actual, o ingresá una nueva')
                        : t('Ingresá tu clave de API (sk-...)')
                    }
                    className="w-full pr-20 pl-3 py-2 border border-gray-border rounded-md text-[12px] font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-sec hover:text-text-pri px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {showApiKey ? t('Ocultar') : t('Mostrar')}
                  </button>
                </div>
                <p className="text-[10.5px] text-text-ter mt-1">
                  {t('Tu clave se almacena de forma cifrada en la base de datos y nunca se comparte con terceros.')}
                </p>
              </div>

              <div>
                <label className="text-[11.5px] font-medium text-text-pri block mb-1">
                  {t('Modelo Pedagógico Asignado')}
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    setTestResult(null);
                  }}
                  className="form-select w-full border border-gray-border rounded-md px-3 py-1.5 text-[12px] bg-white"
                >
                  {aiProvider === 'openai' ? (
                    <>
                      <option value="gpt-4o-mini">{t('gpt-4o-mini (Recomendado: balance óptimo de velocidad y costo)')}</option>
                      <option value="gpt-4o">{t('gpt-4o (Máxima capacidad de razonamiento profundo)')}</option>
                      <option value="gpt-3.5-turbo">{t('gpt-3.5-turbo (Legacy)')}</option>
                    </>
                  ) : (
                    <>
                      <option value="deepseek-chat">{t('deepseek-chat (Recomendado: alta fluidez y precisión pedagógica)')}</option>
                      <option value="deepseek-reasoner">{t('deepseek-reasoner (Modo razonamiento reflexivo)')}</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-[12px] flex items-start gap-2 ${
                testResult.success
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <Icon
                name={testResult.success ? 'check' : 'alert-circle'}
                size={16}
                className={`shrink-0 mt-0.5 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}
              />
              <div>
                <span className="font-semibold block">
                  {testResult.success ? t('Validación exitosa') : t('Error en la conexión')}
                </span>
                <span>{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="flex items-center gap-1.5 bg-surface hover:bg-gray-100 text-text-pri border border-gray-border text-[11.5px] font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <Icon name="refresh-cw" size={12} className={testingAi ? 'animate-spin' : ''} />
              {testingAi ? t('Probando conexión…') : t('Probar conexión con la IA')}
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-green-dark hover:bg-green-hover text-white text-[11.5px] font-medium px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {savingConfig ? t('Guardando…') : t('Guardar configuración')}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">{t('CU-05-05 · Usuarios y roles de la institución')}</div>

        <div className="flex flex-wrap gap-2 mb-3.5">
          <input
            placeholder={t('Nombre')}
            value={inviteForm.name}
            onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[140px]"
          />
          <input
            placeholder={t('Email institucional')}
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[180px]"
          />
          <select
            value={inviteForm.role}
            onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
            className="form-select border border-gray-border rounded-md px-2.5 py-1.5 text-[12px]"
          >
            <option value="docente">{t(ROLE_LABEL.docente)}</option>
            <option value="coordinador">{t(ROLE_LABEL.coordinador)}</option>
          </select>
          <button onClick={handleInvite} disabled={inviting} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {inviting ? t('Invitando…') : t('Invitar')}
          </button>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Nombre')}</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Email')}</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Rol')}</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Aulas de Trabajo')}</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Estado')}</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">{t('Acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-2.5 py-2.5 border-b border-gray-border font-medium text-text-pri">{user.name}</td>
                <td className="px-2.5 py-2.5 border-b border-gray-border text-text-sec">{user.email}</td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                    className="form-select border border-gray-border rounded-md px-2 py-1 text-[11.5px]"
                  >
                    <option value="docente">{t(ROLE_LABEL.docente)}</option>
                    <option value="coordinador">{t(ROLE_LABEL.coordinador)}</option>
                    <option value="admin">{t(ROLE_LABEL.admin)}</option>
                  </select>
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  {user.role === 'docente' ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const assigned = courses.filter((c) => c.teacherId === user.id);
                        if (assigned.length === 0) {
                          return (
                            <span className="text-[11px] text-text-sec italic">
                              {t('Sin aulas')}
                            </span>
                          );
                        }
                        return (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {assigned.slice(0, 2).map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                                title={`${c.name} (${c.subject})`}
                              >
                                {c.name}
                              </span>
                            ))}
                            {assigned.length > 2 && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                +{assigned.length - 2}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => setAssigningTeacher(user)}
                        className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors shrink-0"
                        title={t('Editar aulas asignadas')}
                      >
                        <Icon name="edit" size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-text-sec">—</span>
                  )}
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  {!user.active ? (
                    <Badge color="gray">{t('Desactivado')}</Badge>
                  ) : user.lastLoginAt ? (
                    <Badge color="green">{t('Activo')}</Badge>
                  ) : (
                    <span title={t('Fue invitado/a y todavía no ingresó a Habitar.')}>
                      <Badge color="amber">{t('Invitación pendiente')}</Badge>
                    </span>
                  )}
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <div className="flex items-center gap-1.5">
                    {user.role === 'docente' && (
                      <button
                        onClick={() => setAssigningTeacher(user)}
                        className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-[6px] px-2 py-1 text-[10.5px] font-semibold transition-colors shrink-0"
                        title={t('Asignar aulas a este docente')}
                      >
                        <Icon name="school" size={11} />
                        <span>{t('Asignar Aulas')}</span>
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(user)} className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]">
                      <Icon name={user.active ? 'lock' : 'check'} size={10} />
                      {user.active ? t('Desactivar') : t('Reactivar')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">{t('CU-04-04 · Retención y purga de datos')}</div>
        <div className="text-[11px] text-text-sec mb-3">
          {t('Los datos de alumnos dados de alta hace más del período configurado son elegibles para purga (Ley 25.326).')}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <label className="text-[12px] text-text-sec">{t('Retener datos por')}</label>
          <input
            type="number"
            min={1}
            max={120}
            value={retentionMonths}
            onChange={(e) => setRetentionMonths(Number(e.target.value))}
            className="w-16 border border-gray-border rounded-md px-2 py-1 text-[12px]"
          />
          <span className="text-[12px] text-text-sec">{t('meses')}</span>
          <button onClick={handleSaveRetention} className="bg-white border border-gray-border rounded-md text-[11.5px] px-2.5 py-1.5">
            {t('Guardar')}
          </button>
        </div>
        <div className="text-[11px] text-text-ter mb-2.5">
          {t('Última purga:')}{' '}{retention?.lastPurgeAt ? new Date(retention.lastPurgeAt).toLocaleDateString(intlLocale()) : t('nunca')}
        </div>
        <button onClick={handlePurge} disabled={purging} className="flex items-center gap-1.5 bg-red text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          <Icon name="trash" size={12} />
          {purging ? t('Purgando…') : t('Ejecutar purga ahora')}
        </button>
      </Card>

      {assigningTeacher && (
        <AssignTeacherCoursesModal
          teacher={assigningTeacher}
          availableCourses={courses}
          onClose={() => setAssigningTeacher(null)}
          onSaved={() => {
            refresh();
            showToast(t('Aulas asignadas correctamente al docente'));
          }}
        />
      )}
    </div>
  );
}
