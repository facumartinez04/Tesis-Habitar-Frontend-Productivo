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
import {
  inviteInstitutionUser,
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

const ROLE_LABEL: Record<Role, string> = { docente: 'Docente', coordinador: 'Coordinador/a',
  director: 'Director/a', admin: 'Admin' };
const LEVEL_LABEL: Record<EducationLevel, string> = { primario: 'Primario', secundario: 'Secundario' };
const AXIS_LABEL: Record<ComprehensionAxis, string> = { literal: 'Literal', inferencial: 'Inferencial', critico: 'Crítico' };

export function InstitutionSettingsScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const { message, showToast } = useToast();

  const [institution, setInstitution] = useState<Institution | null>(null);
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
      setAlertThreshold(institution.alertThreshold);
      setAlertEmailsEnabled(institution.alertEmailsEnabled);
    }
  }, [institution]);

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
      showToast('Identificación de alumnos y alertas guardadas');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar la configuración');
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
      showToast('Configuración institucional e IA guardada');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar la configuración');
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
        showToast('¡Prueba de conexión exitosa con la IA!');
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Fallo en la prueba de conexión',
      });
    } finally {
      setTestingAi(false);
    }
  }

  async function handleInvite() {
    if (!session || !inviteForm.name.trim() || !inviteForm.email.trim()) return;
    setInviting(true);
    try {
      await inviteInstitutionUser(session.user.institutionId, { ...inviteForm, provider: 'google' });
      setInviteForm({ name: '', email: '', role: 'docente' });
      showToast('Usuario invitado');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo invitar al usuario');
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(user: InstitutionUser) {
    if (!session) return;
    if (user.active) {
      const confirmed = await confirmDestructive({
        title: `¿Desactivar a ${user.name}?`,
        text: 'Va a perder el acceso a Habitar hasta que lo vuelvas a activar.',
        confirmButtonText: 'Sí, desactivar',
      });
      if (!confirmed) return;
    }
    try {
      await setInstitutionUserActive(session.user.institutionId, user.id, !user.active);
      refresh();
    } catch (err) {
      showError('No se pudo actualizar el usuario', err instanceof Error ? err.message : undefined);
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
    showToast('Política de retención actualizada');
    refresh();
  }

  async function handlePurge() {
    if (!session) return;
    const confirmed = await confirmDestructive({
      title: '¿Purgar datos vencidos?',
      text: `Se van a eliminar de forma permanente los alumnos dados de alta hace más de ${retentionMonths} meses. Esta acción no se puede deshacer.`,
      confirmButtonText: 'Sí, purgar',
    });
    if (!confirmed) return;

    setPurging(true);
    try {
      const result = await purgeExpiredData(session.user.institutionId);
      showToast(`Purga completada: ${result.purgedStudentCount} alumnos eliminados`);
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
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri tracking-tight">Configuración institucional</div>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">CU-05-06 · Niveles y ejes de comprensión habilitados</div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">Niveles</div>
            <div className="flex gap-2">
              {(['primario', 'secundario'] as EducationLevel[]).map((level) => (
                <label key={level} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={levels.includes(level)} onChange={() => toggle(levels, level, setLevels)} />
                  {LEVEL_LABEL[level]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-ter mb-1.5">Ejes de comprensión</div>
            <div className="flex gap-2">
              {(['literal', 'inferencial', 'critico'] as ComprehensionAxis[]).map((axis) => (
                <label key={axis} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={axes.includes(axis)} onChange={() => toggle(axes, axis, setAxes)} />
                  {AXIS_LABEL[axis]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSaveConfig} disabled={savingConfig} className="mt-3 bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          {savingConfig ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">Identificación de los alumnos</div>
        <div className="text-[11.5px] text-text-sec mb-3 leading-relaxed">
          Los alumnos no crean cuenta. Por defecto se identifican con su nombre y apellido, que es lo que ve el docente en el
          panel y en los resultados. Si la institución prefiere no guardar nombres de menores, puede pedir sólo el número de
          lista: el docente sabe quién es quién por su lista del curso.
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { value: 'nombre', label: 'Nombre y apellido' },
            { value: 'lista', label: 'Sólo número de lista' },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-[12px] bg-surface rounded-md px-2.5 py-1.5 cursor-pointer">
              <input type="radio" name="studentIdMode" checked={studentIdMode === opt.value} onChange={() => setStudentIdMode(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="text-[12.5px] font-medium mb-1">Alertas de rendimiento (CU-03-03)</div>
        <div className="text-[11.5px] text-text-sec mb-2 leading-relaxed">
          Cuando el promedio de un curso en un eje, en sus últimas cinco actividades, queda debajo del umbral, Habitar genera
          una alerta. Más de 15 puntos debajo, la alerta es crítica.
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <label className="flex items-center gap-2 text-[12px]">
            Umbral
            <input
              type="number"
              min={0}
              max={100}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-[70px] px-2 py-1 border border-gray-border rounded-md text-[12px] bg-white"
            />
            puntos
          </label>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
            <input type="checkbox" checked={alertEmailsEnabled} onChange={(e) => setAlertEmailsEnabled(e.target.checked)} />
            Avisar por correo a la coordinación
          </label>
        </div>
        <button
          onClick={handleSaveStudentsAndAlerts}
          disabled={savingStudents}
          className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {savingStudents ? 'Guardando…' : 'Guardar identificación y alertas'}
        </button>
      </Card>

      {}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
          <div>
            <div className="text-[13px] font-semibold text-text-pri flex items-center gap-1.5">
              <Icon name="sparkles" size={14} className="text-green-dark" />
              Inteligencia Artificial y Modelos Pedagógicos
            </div>
            <div className="text-[11.5px] text-text-sec mt-0.5">
              Motor para la generación de actividades de comprensión lectora (ejes literal, inferencial y crítico).
            </div>
          </div>
          <Badge color={aiProvider === 'openai' ? 'blue' : 'green'}>
            {aiProvider === 'openai' ? 'OpenAI (ChatGPT)' : 'DeepSeek'} · {aiKeySource === 'custom' ? 'Clave Propia (BYOK)' : 'Clave Habitar'}
          </Badge>
        </div>

        <div className="space-y-4 pt-1">
          {}
          <div>
            <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider mb-2">
              1. Proveedor de Inteligencia Artificial
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
                    <span className="text-[10.5px] bg-green-dark text-white px-2 py-0.5 rounded-full font-medium">Activo</span>
                  )}
                </div>
                <p className="text-[11.5px] text-text-sec">
                  Modelo con alta capacidad de razonamiento y comprensión textual en español rioplatense.
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
                  <span className="font-semibold text-[13px] text-text-pri">OpenAI (ChatGPT)</span>
                  {aiProvider === 'openai' && (
                    <span className="text-[10.5px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Activo</span>
                  )}
                </div>
                <p className="text-[11.5px] text-text-sec">
                  Modelos GPT-4o-mini y GPT-4o reconocidos mundialmente por velocidad y rigor pedagógico.
                </p>
              </button>
            </div>
          </div>

          {}
          <div>
            <div className="text-[11px] font-semibold text-text-sec uppercase tracking-wider mb-2">
              2. Origen de la Clave de API (Key Source)
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
                  <div className="font-medium text-[12.5px] text-text-pri">Clave Central de Habitar (Servidor)</div>
                  <div className="text-[11.5px] text-text-sec mt-0.5">
                    Utiliza la infraestructura central. El consumo se descuenta de la cuota mensual del plan contratado.
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
                  <div className="font-medium text-[12.5px] text-text-pri">Clave Propia de la Escuela (BYOK)</div>
                  <div className="text-[11.5px] text-text-sec mt-0.5">
                    Tu colegio usa su propia API Key de OpenAI o DeepSeek. No consume cuotas de la plataforma Habitar.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {}
          {aiKeySource === 'custom' && (
            <div className="bg-surface p-3.5 rounded-lg border border-gray-border space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-medium text-text-pri">
                    API Key de {aiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'}
                  </label>
                  {institution?.hasCustomApiKey && (
                    <span className="text-[10.5px] text-text-sec font-mono bg-white px-2 py-0.5 rounded border border-gray-border">
                      Clave guardada: {institution.aiCustomApiKeyMasked}
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
                        ? 'Dejá vacío para conservar la clave actual, o ingresá una nueva'
                        : 'Ingresá tu clave de API (sk-...)'
                    }
                    className="w-full pr-20 pl-3 py-2 border border-gray-border rounded-md text-[12px] font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-sec hover:text-text-pri px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <p className="text-[10.5px] text-text-ter mt-1">
                  Tu clave se almacena de forma cifrada en la base de datos y nunca se comparte con terceros.
                </p>
              </div>

              {}
              <div>
                <label className="text-[11.5px] font-medium text-text-pri block mb-1">
                  Modelo Pedagógico Asignado
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
                      <option value="gpt-4o-mini">gpt-4o-mini (Recomendado: balance óptimo de velocidad y costo)</option>
                      <option value="gpt-4o">gpt-4o (Máxima capacidad de razonamiento profundo)</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                    </>
                  ) : (
                    <>
                      <option value="deepseek-chat">deepseek-chat (Recomendado: alta fluidez y precisión pedagógica)</option>
                      <option value="deepseek-reasoner">deepseek-reasoner (Modo razonamiento reflexivo)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {}
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
                  {testResult.success ? 'Validación exitosa' : 'Error en la conexión'}
                </span>
                <span>{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            </div>
          )}

          {}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="flex items-center gap-1.5 bg-surface hover:bg-gray-100 text-text-pri border border-gray-border text-[11.5px] font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <Icon name="refresh-cw" size={12} className={testingAi ? 'animate-spin' : ''} />
              {testingAi ? 'Probando conexión…' : 'Probar conexión con la IA'}
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-green-dark hover:bg-green-hover text-white text-[11.5px] font-medium px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {savingConfig ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-3">CU-05-05 · Usuarios y roles de la institución</div>

        <div className="flex flex-wrap gap-2 mb-3.5">
          <input
            placeholder="Nombre"
            value={inviteForm.name}
            onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[140px]"
          />
          <input
            placeholder="Email institucional"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-gray-border rounded-md px-2.5 py-1.5 text-[12px] flex-1 min-w-[180px]"
          />
          <select
            value={inviteForm.role}
            onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
            className="form-select border border-gray-border rounded-md px-2.5 py-1.5 text-[12px]"
          >
            <option value="docente">{ROLE_LABEL.docente}</option>
            <option value="coordinador">{ROLE_LABEL.coordinador}</option>
          </select>
          <button onClick={handleInvite} disabled={inviting} className="bg-green-dark text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
            {inviting ? 'Invitando…' : 'Invitar'}
          </button>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Nombre</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Email</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Rol</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Aulas de Trabajo</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Estado</th>
              <th className="text-left text-[11px] text-text-sec font-medium px-2.5 py-2 border-b border-gray-border bg-white">Acciones</th>
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
                    <option value="docente">{ROLE_LABEL.docente}</option>
                    <option value="coordinador">{ROLE_LABEL.coordinador}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
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
                              Sin aulas
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
                        title="Editar aulas asignadas"
                      >
                        <Icon name="edit" size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-text-sec">—</span>
                  )}
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <Badge color={user.active ? 'green' : 'gray'}>{user.active ? 'Activo' : 'Desactivado'}</Badge>
                </td>
                <td className="px-2.5 py-2.5 border-b border-gray-border">
                  <div className="flex items-center gap-1.5">
                    {user.role === 'docente' && (
                      <button
                        onClick={() => setAssigningTeacher(user)}
                        className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-[6px] px-2 py-1 text-[10.5px] font-semibold transition-colors shrink-0"
                        title="Asignar aulas a este docente"
                      >
                        <Icon name="school" size={11} />
                        <span>Asignar Aulas</span>
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(user)} className="flex items-center gap-1 bg-white border border-gray-border rounded-[6px] px-2 py-1 text-[10.5px]">
                      <Icon name={user.active ? 'lock' : 'check'} size={10} />
                      {user.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <div className="text-[12.5px] font-medium mb-1">CU-04-04 · Retención y purga de datos</div>
        <div className="text-[11px] text-text-sec mb-3">
          Los datos de alumnos dados de alta hace más del período configurado son elegibles para purga (Ley 25.326).
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <label className="text-[12px] text-text-sec">Retener datos por</label>
          <input
            type="number"
            min={1}
            max={120}
            value={retentionMonths}
            onChange={(e) => setRetentionMonths(Number(e.target.value))}
            className="w-16 border border-gray-border rounded-md px-2 py-1 text-[12px]"
          />
          <span className="text-[12px] text-text-sec">meses</span>
          <button onClick={handleSaveRetention} className="bg-white border border-gray-border rounded-md text-[11.5px] px-2.5 py-1.5">
            Guardar
          </button>
        </div>
        <div className="text-[11px] text-text-ter mb-2.5">
          Última purga: {retention?.lastPurgeAt ? new Date(retention.lastPurgeAt).toLocaleDateString('es-AR') : 'nunca'}
        </div>
        <button onClick={handlePurge} disabled={purging} className="flex items-center gap-1.5 bg-red text-white text-[11.5px] px-3 py-1.5 rounded-md disabled:opacity-50">
          <Icon name="trash" size={12} />
          {purging ? 'Purgando…' : 'Ejecutar purga ahora'}
        </button>
      </Card>

      {}
      {assigningTeacher && (
        <AssignTeacherCoursesModal
          teacher={assigningTeacher}
          availableCourses={courses}
          onClose={() => setAssigningTeacher(null)}
          onSaved={() => {
            refresh();
            showToast('Aulas asignadas correctamente al docente');
          }}
        />
      )}
    </div>
  );
}
