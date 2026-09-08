import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { ensureAdminSession } from '../../../services/authService';
import { listPlans, listSubscriptions, renewSubscription, updateSubscription } from '../../../services/subscriptionService';
import type { Subscription, SubscriptionPlan } from '../../../types/subscription';

function formatArs(value: number) {
  return new Intl.NumberFormat('es-AR').format(value);
}

export function RenewalScreen() {
  const { message, showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAdminSession().then(() => {
      Promise.all([listSubscriptions(), listPlans()]).then(([result, plansResult]) => {
        setSubscriptions(result);
        setPlans(plansResult);
        setExpandedId(result.find((s) => s.daysUntilExpiration <= 15)?.id ?? null);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  async function handleRenew(id: string) {
    setBusyId(id);
    const updated = await renewSubscription(id);
    if (updated) {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
    setBusyId(null);
    showToast('Renovación confirmada');
  }

  async function handleFieldChange(id: string, input: Parameters<typeof updateSubscription>[1]) {
    const updated = await updateSubscription(id, input);
    if (updated) {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Gestión de renovaciones</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">Instituciones con vencimiento en los próximos 60 días</div>

      {subscriptions.map((subscription) => {
        const isUrgent = subscription.daysUntilExpiration <= 15;
        const isExpanded = expandedId === subscription.id;
        return (
          <div
            key={subscription.id}
            className={`bg-white border rounded-md p-4 mb-3.5 ${isUrgent ? 'border-[#FAC775]' : 'border-gray-border'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="text-[15px] font-medium mb-1">{subscription.institutionName}</div>
                <div className="text-xs text-text-sec mb-2">
                  Plan {plans.find((p) => p.id === subscription.planId)?.name} · ARS {formatArs(subscription.monthlyPriceArs)}/mes · Vence el{' '}
                  <strong>{subscription.expiresAt}</strong>
                </div>
                {subscription.managementStatus === 'confirmado' ? (
                  <Badge color="green">
                    <span className="flex items-center gap-1">
                      <Icon name="check" size={11} />
                      Confirmado
                    </span>
                  </Badge>
                ) : isUrgent ? (
                  <Badge color="amber">
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={11} />
                      Vence en {subscription.daysUntilExpiration} días
                    </span>
                  </Badge>
                ) : (
                  <Badge color="gray">En {subscription.daysUntilExpiration} días</Badge>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {subscription.managementStatus !== 'confirmado' && (
                  <button
                    onClick={() => handleRenew(subscription.id)}
                    disabled={busyId === subscription.id}
                    className="bg-green-dark text-white px-3.5 py-1.5 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
                  >
                    {busyId === subscription.id ? 'Renovando…' : 'Renovar'}
                  </button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : subscription.id)}
                  className="bg-white border border-gray-border rounded-[6px] px-3.5 py-1.5 text-[12.5px]"
                >
                  {isExpanded ? 'Ocultar' : 'Gestionar'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <>
                <hr className="border-gray-border my-3.5" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Nuevo plan</label>
                    <select
                      value={subscription.planId}
                      onChange={(e) => handleFieldChange(subscription.id, { planId: e.target.value })}
                      className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name} · ARS {formatArs(plan.monthlyPriceArs)}/mes</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Duración</label>
                    <select
                      value={subscription.durationMonths}
                      onChange={(e) => handleFieldChange(subscription.id, { durationMonths: Number(e.target.value) })}
                      className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
                    >
                      <option value={12}>12 meses</option>
                      <option value={6}>6 meses</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Estado de gestión</label>
                    <select
                      value={subscription.managementStatus}
                      onChange={(e) => handleFieldChange(subscription.id, { managementStatus: e.target.value as Subscription['managementStatus'] })}
                      className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
                    >
                      <option value="en_negociacion">En negociación</option>
                      <option value="confirmado">Confirmado</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      <hr className="border-gray-border my-3.5" />
      <div className="text-[11.5px] text-text-ter">
        Las instituciones sin respuesta antes del vencimiento pasan automáticamente a estado de gracia (15 días de acceso limitado).
      </div>
    </div>
  );
}
