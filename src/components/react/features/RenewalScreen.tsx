import { useEffect, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { TableWrap } from '../ui/TableWrap';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { useToast } from '../../../hooks/useToast';
import { ensureAdminSession } from '../../../services/authService';
import {
  createPlan,
  deletePlan,
  listPlans,
  listSubscriptions,
  renewSubscription,
  updatePlan,
  updateSubscription,
} from '../../../services/subscriptionService';
import type {
  CreatePlanInput,
  PlanFeatures,
  Subscription,
  SubscriptionManagementStatus,
  SubscriptionPlan,
  UpdatePlanInput,
} from '../../../types/subscription';
import { t, useI18n, intlLocale } from '../../../i18n';

function formatArs(value: number) {
  return new Intl.NumberFormat(intlLocale()).format(value);
}

const DEFAULT_FEATURE_FLAGS: PlanFeatures = {
  hasAiAnalytics: false,
  hasEarlyAlerts: true,
  hasArcoCompliance: true,
  hasCustomDomain: false,
  hasApiAccess: false,
  hasSlaSupport: false,
  hasExportReports: true,
  bullets: [],
};

export function RenewalScreen() {
  useI18n();
  const { message, showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'instituciones' | 'planes' | 'comparativa'>('instituciones');

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const pagedSubscriptions = usePagination(subscriptions, 10, null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [customizingSub, setCustomizingSub] = useState<Subscription | null>(null);
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [customUsers, setCustomUsers] = useState<number | ''>('');
  const [customStudents, setCustomStudents] = useState<number | ''>('');
  const [customCourses, setCustomCourses] = useState<number | ''>('');
  const [customStorage, setCustomStorage] = useState<number | ''>('');
  const [customNotes, setCustomNotes] = useState('');
  const [customBillingCycle, setCustomBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [customFeatures, setCustomFeatures] = useState<PlanFeatures>(DEFAULT_FEATURE_FLAGS);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState<CreatePlanInput>({
    name: '',
    description: '',
    monthlyPriceArs: 150000,
    annualPriceArs: 1500000,
    maxUsers: 50,
    maxStudents: 600,
    maxCourses: 25,
    storageGb: 20,
    badge: '',
    features: DEFAULT_FEATURE_FLAGS,
  });
  const [bulletText, setBulletText] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const loadData = async () => {
    try {
      await ensureAdminSession();
      const [subsData, plansData] = await Promise.all([listSubscriptions(), listPlans(true)]);
      setSubscriptions(subsData);
      setPlans(plansData);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando suscripciones y planes:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleRenew(id: string) {
    setBusyId(id);
    const updated = await renewSubscription(id);
    if (updated) {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
    setBusyId(null);
    showToast(t('Renovación confirmada exitosamente'));
  }

  function handleOpenCustomize(sub: Subscription) {
    const basePlan = plans.find((p) => p.id === sub.planId);
    setCustomizingSub(sub);
    setCustomPrice(sub.monthlyPriceArs);
    setCustomUsers(sub.customMaxUsers ?? '');
    setCustomStudents(sub.customMaxStudents ?? '');
    setCustomCourses(sub.customMaxCourses ?? '');
    setCustomStorage(sub.customStorageGb ?? '');
    setCustomNotes(sub.customNotes || '');
    setCustomBillingCycle(sub.billingCycle || 'MONTHLY');
    setCustomFeatures({
      ...DEFAULT_FEATURE_FLAGS,
      ...(basePlan?.features || {}),
      ...(sub.customFeatures || {}),
    });
  }

  async function handleSaveCustomize(e: React.FormEvent) {
    e.preventDefault();
    if (!customizingSub) return;
    setIsSavingCustom(true);

    const updated = await updateSubscription(customizingSub.id, {
      monthlyPriceArs: customPrice === '' ? undefined : Number(customPrice),
      customMaxUsers: customUsers === '' ? null : Number(customUsers),
      customMaxStudents: customStudents === '' ? null : Number(customStudents),
      customMaxCourses: customCourses === '' ? null : Number(customCourses),
      customStorageGb: customStorage === '' ? null : Number(customStorage),
      customNotes: customNotes || null,
      billingCycle: customBillingCycle,
      customFeatures,
    });

    setIsSavingCustom(false);
    if (updated) {
      setSubscriptions((prev) => prev.map((s) => (s.id === customizingSub.id ? updated : s)));
      setCustomizingSub(null);
      showToast(t('Personalización guardada con éxito'));
    } else {
      alert(t('Error guardando la personalización'));
    }
  }

  function handleOpenNewPlan() {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      description: '',
      monthlyPriceArs: 150000,
      annualPriceArs: 1500000,
      maxUsers: 50,
      maxStudents: 600,
      maxCourses: 25,
      storageGb: 20,
      badge: '',
      features: { ...DEFAULT_FEATURE_FLAGS, bullets: [] },
    });
    setBulletText('');
    setIsPlanModalOpen(true);
  }

  function handleOpenEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      monthlyPriceArs: plan.monthlyPriceArs,
      annualPriceArs: plan.annualPriceArs,
      maxUsers: plan.maxUsers,
      maxStudents: plan.maxStudents,
      maxCourses: plan.maxCourses,
      storageGb: plan.storageGb,
      badge: plan.badge || '',
      features: { ...plan.features, bullets: plan.features.bullets || [] },
    });
    setBulletText('');
    setIsPlanModalOpen(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planForm.name.trim()) return;
    setIsSavingPlan(true);

    try {
      if (editingPlan) {
        const updated = await updatePlan(editingPlan.id, planForm as UpdatePlanInput);
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? updated : p)));
        showToast(t('Plan "{name}" actualizado', { name: updated.name }));
      } else {
        const created = await createPlan(planForm);
        setPlans((prev) => [...prev, created]);
        showToast(t('Plan "{name}" creado con éxito', { name: created.name }));
      }
      setIsPlanModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(t('Error guardando el plan: ') + err.message);
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function handleDeletePlan(plan: SubscriptionPlan) {
    const ok = window.confirm(
      t('¿Deseás eliminar o desactivar el plan "{name}"? Si está en uso por alguna institución, pasará a inactivo.', { name: plan.name })
    );
    if (!ok) return;

    try {
      await deletePlan(plan.id);
      showToast(t('Plan "{name}" procesado', { name: plan.name }));
      await loadData();
    } catch (err: any) {
      alert(t('Error: ') + err.message);
    }
  }

  function handleAddBullet() {
    if (!bulletText.trim()) return;
    const currentBullets = planForm.features?.bullets || [];
    setPlanForm({
      ...planForm,
      features: {
        ...planForm.features,
        bullets: [...currentBullets, bulletText.trim()],
      },
    });
    setBulletText('');
  }

  function handleRemoveBullet(index: number) {
    const currentBullets = planForm.features?.bullets || [];
    setPlanForm({
      ...planForm,
      features: {
        ...planForm.features,
        bullets: currentBullets.filter((_, i) => i !== index),
      },
    });
  }

  if (loading) {
    return <HabitarLoader size="lg" message={t('Cargando planes de suscripción e instituciones...')} />;
  }

  return (
    <div>
      <Toast message={message} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-lg font-semibold text-text-pri tracking-tight flex items-center gap-2">
            <Icon name="refresh" size={18} className="text-emerald-700" />
            {t('Gestión de Suscripciones y Planes Comerciales')}
          </div>
          <div className="text-[12.5px] text-text-sec mt-0.5">
            {t('Administrá contratos, creá planes de suscripción con sus características y personalizá cupos exclusivos por institución.')}
          </div>
        </div>
        {activeTab === 'planes' && (
          <button
            onClick={handleOpenNewPlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Icon name="plus" size={13} />
            {t('Crear Nuevo Plan')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-border mb-6">
        <button
          onClick={() => setActiveTab('instituciones')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'instituciones'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <Icon name="school" size={13} />
          {t('Suscripciones por Institución')}
          <span className="ml-1 bg-gray-100 text-text-sec px-1.5 py-0.5 rounded text-[10px]">
            {subscriptions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('planes')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'planes'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <Icon name="tag" size={13} />
          {t('Planes de Suscripción')}
          <span className="ml-1 bg-gray-100 text-text-sec px-1.5 py-0.5 rounded text-[10px]">
            {plans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('comparativa')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'comparativa'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <Icon name="chart" size={13} />
          {t('Matriz Comparativa de Capacidades')}
        </button>
      </div>

      {activeTab === 'instituciones' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-3">
            <Icon name="shield" size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>{t('Personalización por Negocio:')}</strong>{' '}{t('Cada colegio puede tener un plan base (ej: Estándar o Premium) y límites o módulos personalizados exclusivamente para su convenio (ej: más docentes, alumnos, acceso a API o precio acordado).')}
            </div>
          </div>

          <div className="space-y-3">
            {pagedSubscriptions.pageItems.map((sub) => {
              const basePlan = plans.find((p) => p.id === sub.planId);
              const isUrgent = sub.daysUntilExpiration <= 15;
              const hasCustomOverrides =
                sub.customMaxUsers !== null && sub.customMaxUsers !== undefined ||
                sub.customMaxStudents !== null && sub.customMaxStudents !== undefined ||
                sub.customMaxCourses !== null && sub.customMaxCourses !== undefined ||
                sub.customStorageGb !== null && sub.customStorageGb !== undefined ||
                !!sub.customFeatures ||
                !!sub.customNotes;

              return (
                <div
                  key={sub.id}
                  className={`bg-white border rounded-xl p-5 shadow-2xs transition-all ${
                    isUrgent ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-border'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-text-pri">{sub.institutionName}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-xs">
                          {basePlan?.name || sub.planName || t('Plan Personalizado')}
                        </span>
                        {hasCustomOverrides && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold text-[10px] flex items-center gap-1">
                            <Icon name="lock" size={10} />
                            {t('Personalizado a medida')}
                          </span>
                        )}
                        {sub.managementStatus === 'confirmado' ? (
                          <Badge color="green">
                            <span className="flex items-center gap-1">
                              <Icon name="check" size={11} />
                              {t('Confirmado')}
                            </span>
                          </Badge>
                        ) : isUrgent ? (
                          <Badge color="amber">
                            <span className="flex items-center gap-1">
                              <Icon name="clock" size={11} />
                              {t('Vence en {daysUntilExpiration} días', { daysUntilExpiration: sub.daysUntilExpiration })}
                            </span>
                          </Badge>
                        ) : (
                          <Badge color="gray">{t('En {daysUntilExpiration} días', { daysUntilExpiration: sub.daysUntilExpiration })}</Badge>
                        )}
                      </div>

                      <div className="text-xs text-text-sec flex items-center gap-2 flex-wrap">
                        <span>
                          {t('Precio:')}{' '}<strong>ARS {formatArs(sub.monthlyPriceArs)}</strong>/mes ({sub.billingCycle === 'ANNUAL' ? t('Facturación Anual') : t('Facturación Mensual')})
                        </span>
                        <span>•</span>
                        <span>
                          {t('Vencimiento:')}{' '}<strong>{sub.expiresAt}</strong>{' '}{t('({durationMonths} meses)', { durationMonths: sub.durationMonths })}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-sec font-mono">
                        <span className="bg-gray-50 border border-gray-border px-2 py-1 rounded">
                          <Icon name="users" size={12} className="inline-block align-[-2px] mr-1" />{t('Docentes:')}{' '}<strong>{sub.effectiveMaxUsers ?? 50}</strong>
                        </span>
                        <span className="bg-gray-50 border border-gray-border px-2 py-1 rounded">
                          <Icon name="school" size={12} className="inline-block align-[-2px] mr-1" />{t('Alumnos:')}{' '}<strong>{sub.effectiveMaxStudents ?? 500}</strong>
                        </span>
                        <span className="bg-gray-50 border border-gray-border px-2 py-1 rounded">
                          <Icon name="book" size={12} className="inline-block align-[-2px] mr-1" />{t('Cursos:')}{' '}<strong>{sub.effectiveMaxCourses ?? 20}</strong>
                        </span>
                        <span className="bg-gray-50 border border-gray-border px-2 py-1 rounded">
                          <Icon name="database" size={12} className="inline-block align-[-2px] mr-1" />{t('Almacenamiento:')}{' '}<strong>{sub.effectiveStorageGb ?? 10} GB</strong>
                        </span>
                        {sub.effectiveFeatures?.hasAiAnalytics && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-sans font-medium">
                            <Icon name="sparkles" size={12} className="inline-block align-[-2px] mr-1" />{t('IA activa')}
                          </span>
                        )}
                        {sub.effectiveFeatures?.hasApiAccess && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-sans font-medium">
                            <Icon name="plug" size={12} className="inline-block align-[-2px] mr-1" />{t('API conectada')}
                          </span>
                        )}
                      </div>

                      {sub.customNotes && (
                        <div className="text-[11px] text-text-ter italic mt-1">
                          {t('Nota de acuerdo: {customNotes}', { customNotes: sub.customNotes })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                      <button
                        onClick={() => handleOpenCustomize(sub)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-border hover:bg-gray-50 rounded-lg text-xs font-semibold text-text-pri shadow-2xs transition-colors"
                      >
                        <Icon name="sliders" size={13} />
                        {t('Personalizar Negocio')}
                      </button>

                      {sub.managementStatus !== 'confirmado' && (
                        <button
                          onClick={() => handleRenew(sub.id)}
                          disabled={busyId === sub.id}
                          className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                        >
                          {busyId === sub.id ? t('Renovando…') : t('Renovar')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            <Pagination page={pagedSubscriptions.page} totalPages={pagedSubscriptions.totalPages} total={pagedSubscriptions.total} pageSize={pagedSubscriptions.pageSize} onChange={pagedSubscriptions.setPage} label={t('suscripciones')} />
        </div>
      )}

      {activeTab === 'planes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white border rounded-xl p-5 shadow-2xs flex flex-col justify-between relative transition-all ${
                  plan.badge === 'Recomendado'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-border'
                }`}
              >
                <div>
                  {plan.badge && (
                    <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {t(plan.badge)}
                    </span>
                  )}

                  <h3 className="text-base font-bold text-text-pri">{t(plan.name)}</h3>
                  <p className="text-xs text-text-sec mt-1 line-clamp-2 min-h-[32px]">
                    {t(plan.description) || t('Plan comercial estándar de la plataforma.')}
                  </p>

                  <div className="mt-4 pb-4 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-text-pri">
                        ARS {formatArs(plan.monthlyPriceArs)}
                      </span>
                      <span className="text-xs text-text-ter">/mes</span>
                    </div>
                    {plan.annualPriceArs > 0 && (
                      <div className="text-[11px] text-text-sec mt-0.5">
                        {t('ARS {formatArs} al año (ahorro de 2 meses)', { formatArs: formatArs(plan.annualPriceArs) })}
                      </div>
                    )}
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-text-sec border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <span>{t('Personal docente:')}</span>
                      <strong className="text-text-pri">{t('{maxUsers} usuarios', { maxUsers: plan.maxUsers })}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('Alumnos activos:')}</span>
                      <strong className="text-text-pri">{t('{maxStudents} alumnos', { maxStudents: plan.maxStudents })}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('Divisiones / Cursos:')}</span>
                      <strong className="text-text-pri">{t('{maxCourses} cursos', { maxCourses: plan.maxCourses })}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('Almacenamiento:')}</span>
                      <strong className="text-text-pri">{plan.storageGb} GB</strong>
                    </div>
                  </div>

                  <ul className="py-3 space-y-2 text-xs text-text-sec">
                    {plan.features.bullets && plan.features.bullets.length > 0 ? (
                      plan.features.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Icon name="check" size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{t(b)}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <Icon name="check" size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{t('Alertas tempranas de asistencia')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icon name="check" size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{t('Cumplimiento legal y ARCO')}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="w-full py-1.5 border border-gray-border bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold text-text-pri transition-colors"
                  >
                    {t('Editar Plan')}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan)}
                    className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('Eliminar o desactivar plan')}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparativa' && (
        <div className="bg-white border border-gray-border rounded-xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-border bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-pri">
              {t('Comparativa Detallada de Capacidades por Plan')}
            </span>
            <span className="text-xs text-text-ter">{t('Vista de configuración comercial')}</span>
          </div>

          <TableWrap>
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-text-pri px-4 py-3 border-b border-gray-border bg-white w-1/4">
                  {t('Característica / Recurso')}
                </th>
                {plans.map((p) => (
                  <th
                    key={p.id}
                    className="text-center text-xs font-bold text-text-pri px-4 py-3 border-b border-gray-border bg-white"
                  >
                    <div>{p.name}</div>
                    <div className="text-[11px] font-normal text-emerald-700 mt-0.5">
                      ARS {formatArs(p.monthlyPriceArs)}/m
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Límite de Docentes / Staff')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center font-mono">
                    {p.maxUsers}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Límite de Estudiantes')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center font-mono">
                    {p.maxStudents}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Límite de Cursos / Divisiones')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center font-mono">
                    {p.maxCourses}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Espacio de Almacenamiento')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center font-mono">
                    {p.storageGb} GB
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Alertas Tempranas de Ausentismo')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasEarlyAlerts ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Analítica Predictiva con IA')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasAiAnalytics ? (
                      <span className="text-purple-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Gestión de Privacidad & ARCO')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasArcoCompliance ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Dominio Personalizado (Marca Blanca)')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasCustomDomain ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('API & Integración SIS/ERP')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasApiAccess ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Soporte SLA Dedicado 24/7')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasSlaSupport ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text-pri">{t('Exportación Avanzada Excel / PDF')}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    {p.features.hasExportReports ? (
                      <span className="text-emerald-700 font-bold"><Icon name="check" size={12} className="inline-block align-[-2px] mr-1" />{t('Incluido')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </TableWrap>
        </div>
      )}

      {customizingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1A1E29] rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-gray-border dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
                  <Icon name="sliders" size={16} className="text-emerald-700 dark:text-emerald-400" />
                  {t('Personalización Exclusiva: {institutionName}', { institutionName: customizingSub.institutionName })}
                </h2>
                <p className="text-xs text-text-sec mt-0.5">
                  {t('Ajustá cupos, tarifas y módulos especiales acordados con este cliente por encima de su plan base.')}
                </p>
              </div>
              <button
                onClick={() => setCustomizingSub(null)}
                className="text-text-ter hover:text-text-pri p-1 rounded-md"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomize} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">{t('Plan Comercial Base')}</label>
                  <select
                    value={customizingSub.planId}
                    onChange={async (e) => {
                      const newPlanId = e.target.value;
                      const selectedPlan = plans.find((p) => p.id === newPlanId);
                      setCustomizingSub({ ...customizingSub, planId: newPlanId });
                      if (selectedPlan) {
                        setCustomPrice(selectedPlan.monthlyPriceArs);
                        setCustomFeatures({
                          ...DEFAULT_FEATURE_FLAGS,
                          ...selectedPlan.features,
                        });
                      }
                    }}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t('{name} (ARS {formatArs}/m)', { name: p.name, formatArs: formatArs(p.monthlyPriceArs) })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">{t('Precio Acordado Mensual (ARS)')}</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">{t('Ciclo de Facturación')}</label>
                  <select
                    value={customBillingCycle}
                    onChange={(e) => setCustomBillingCycle(e.target.value as any)}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MONTHLY">{t('Mensual')}</option>
                    <option value="ANNUAL">{t('Anual')}</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50/80 dark:bg-[#131620] p-3.5 rounded-xl border border-gray-border/70 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-pri">
                    {t('Límites y Cupos Personalizados para este Colegio')}
                  </span>
                  <span className="text-[11px] text-text-ter">{t('Dejar vacío para usar el valor por defecto del plan')}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Docentes / Personal')}</label>
                    <input
                      type="number"
                      placeholder={t('ej: 100')}
                      value={customUsers}
                      onChange={(e) => setCustomUsers(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Alumnos Activos')}</label>
                    <input
                      type="number"
                      placeholder={t('ej: 1200')}
                      value={customStudents}
                      onChange={(e) => setCustomStudents(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Cursos / Aulas')}</label>
                    <input
                      type="number"
                      placeholder={t('ej: 50')}
                      value={customCourses}
                      onChange={(e) => setCustomCourses(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Almacenamiento (GB)')}</label>
                    <input
                      type="number"
                      placeholder={t('ej: 50')}
                      value={customStorage}
                      onChange={(e) => setCustomStorage(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-pri">
                  {t('Módulos y Capacidades Habilitadas para esta Escuela:')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasAiAnalytics}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasAiAnalytics: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Analítica e Inteligencia Artificial')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasEarlyAlerts}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasEarlyAlerts: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Sistema de Alertas Tempranas')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasApiAccess}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasApiAccess: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Acceso a API y Webhooks (SIS / ERP)')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasCustomDomain}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasCustomDomain: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Dominio Propio / Marca Blanca')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasSlaSupport}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasSlaSupport: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('SLA y Soporte Técnico Dedicado')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={customFeatures.hasArcoCompliance}
                      onChange={(e) => setCustomFeatures({ ...customFeatures, hasArcoCompliance: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Módulo de Privacidad y Derechos ARCO')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">{t('Notas Comerciales del Acuerdo')}</label>
                <textarea
                  rows={2}
                  placeholder={t('ej: Descuento 20% acordado por convenio con red de colegios. Incluye 2 sedes.')}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setCustomizingSub(null)}
                  className="px-4 py-2 border border-gray-border dark:border-gray-700 text-xs rounded-lg text-text-sec hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustom}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isSavingCustom ? t('Guardando…') : t('Guardar Personalización')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1A1E29] rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-gray-border dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
                <Icon name="tag" size={16} className="text-emerald-700 dark:text-emerald-400" />
                {editingPlan ? t('Editar Plan: {name}', { name: editingPlan.name }) : t('Crear Nuevo Plan de Suscripción')}
              </h2>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-text-ter hover:text-text-pri p-1 rounded-md"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">
                    {t('Nombre del Plan')}{' '}<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder={t('ej: Plan Red de Colegios')}
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">{t('Distintivo / Badge')}</label>
                  <input
                    type="text"
                    placeholder={t('ej: Popular, Recomendado, Piloto')}
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">{t('Descripción Comercial')}</label>
                <input
                  type="text"
                  placeholder={t('Breve descripción del público objetivo y ventajas de este plan...')}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">
                    {t('Precio Mensual (ARS)')}{' '}<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    value={planForm.monthlyPriceArs}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPriceArs: Number(e.target.value) })}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">{t('Precio Anual (ARS)')}</label>
                  <input
                    type="number"
                    value={planForm.annualPriceArs}
                    onChange={(e) => setPlanForm({ ...planForm, annualPriceArs: Number(e.target.value) })}
                    className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-surface dark:bg-[#131620] text-text-pri focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50/80 dark:bg-[#131620] p-3.5 rounded-xl border border-gray-border/70 dark:border-gray-800 space-y-3">
                <span className="text-xs font-bold text-text-pri block">{t('Límites y Recursos Incluidos en el Plan')}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Docentes')}</label>
                    <input
                      type="number"
                      value={planForm.maxUsers}
                      onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Alumnos')}</label>
                    <input
                      type="number"
                      value={planForm.maxStudents}
                      onChange={(e) => setPlanForm({ ...planForm, maxStudents: Number(e.target.value) })}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Cursos')}</label>
                    <input
                      type="number"
                      value={planForm.maxCourses}
                      onChange={(e) => setPlanForm({ ...planForm, maxCourses: Number(e.target.value) })}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-sec mb-1">{t('Storage (GB)')}</label>
                    <input
                      type="number"
                      value={planForm.storageGb}
                      onChange={(e) => setPlanForm({ ...planForm, storageGb: Number(e.target.value) })}
                      className="w-full border border-gray-border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#1A1E29] text-text-pri"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-pri">{t('Características y Módulos Incluidos:')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasAiAnalytics}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasAiAnalytics: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Analítica Predictiva con IA')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasEarlyAlerts}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasEarlyAlerts: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Alertas Tempranas de Ausentismo')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasApiAccess}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasApiAccess: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Acceso a API & Webhooks')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasCustomDomain}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasCustomDomain: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Dominio Personalizado (Marca Blanca)')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasSlaSupport}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasSlaSupport: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Soporte SLA Dedicado')}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 border border-gray-border dark:border-gray-800 rounded-lg bg-white dark:bg-[#131620] cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 text-text-pri">
                    <input
                      type="checkbox"
                      checked={planForm.features?.hasArcoCompliance}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          features: { ...planForm.features, hasArcoCompliance: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('Privacidad & Derechos ARCO')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  {t('Viñetas de Marketing (Bullets comerciales)')}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={t('ej: Hasta 50 docentes incluidos')}
                    value={bulletText}
                    onChange={(e) => setBulletText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBullet();
                      }
                    }}
                    className="w-full border border-gray-border rounded-lg px-3 py-1.5 text-xs bg-surface text-text-pri"
                  />
                  <button
                    type="button"
                    onClick={handleAddBullet}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text-pri rounded-lg text-xs font-medium"
                  >
                    {t('Agregar')}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {planForm.features?.bullets?.map((b, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(idx)}
                        className="hover:text-red-700 font-bold ml-1"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-gray-border text-xs rounded-lg text-text-sec hover:bg-gray-100 font-medium"
                >
                  {t('Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan || !planForm.name.trim()}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isSavingPlan ? t('Guardando…') : editingPlan ? t('Actualizar Plan') : t('Crear Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
