import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { HabitarLoader } from '../ui/HabitarLoader';
import { syncPaymentReturn, type PaymentStatusView } from '../../../services/financeService';
import type { IconName } from '../../../lib/iconPaths';
import { t, useI18n, intlLocale } from '../../../i18n';

interface PaymentResultScreenProps {
  outcome: 'exito' | 'pendiente' | 'error';
}

const VIEW: Record<PaymentStatusView['status'], { icon: IconName; title: string; text: string; tone: string }> = {
  APROBADO: {
    icon: 'check',
    title: 'Pago aprobado',
    text: 'Mercado Pago confirmó el pago. Ya quedó registrado en Habitar.',
    tone: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  },
  PENDIENTE: {
    icon: 'clock',
    title: 'Pago pendiente',
    text: 'Mercado Pago todavía lo está procesando. Cuando se acredite, Habitar lo marca como pagado solo.',
    tone: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
  },
  RECHAZADO: {
    icon: 'close',
    title: 'El pago no se pudo hacer',
    text: 'Mercado Pago lo rechazó. Podés volver a intentarlo con otro medio de pago.',
    tone: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300',
  },
  REEMBOLSADO: {
    icon: 'refresh',
    title: 'Pago devuelto',
    text: 'El pago fue reintegrado.',
    tone: 'bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300',
  },
};

export function PaymentResultScreen({ outcome }: PaymentResultScreenProps) {
  useI18n();
  const [result, setResult] = useState<PaymentStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') ?? params.get('collection_id') ?? '';
    const reference = params.get('external_reference') ?? '';
    if (!reference) {
      setError(t('No llegó la referencia del pago. Revisá el estado en Habitar.'));
      return;
    }
    syncPaymentReturn(paymentId, reference)
      .then(setResult)
      .catch((err: Error) => setError(err.message || t('No se pudo confirmar el pago.')));
  }, []);

  const fallback = outcome === 'exito' ? 'APROBADO' : outcome === 'pendiente' ? 'PENDIENTE' : 'RECHAZADO';
  const view = VIEW[result?.status ?? fallback];

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white dark:bg-[#1A1E29] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-4">
        {!result && !error ? (
          <HabitarLoader size="sm" message={t('Confirmando el pago con Mercado Pago…')} />
        ) : (
          <>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${view.tone}`}>
              <Icon name={view.icon} size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{error ? t('No pudimos confirmarlo') : t(view.title)}</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{error ?? view.text}</p>
            </div>
            {result && (
              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-700 text-left">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{result.description}</div>
                <div className="text-xs text-stone-500 mt-0.5 tabular-nums">$ {result.amountArs.toLocaleString(intlLocale())}</div>
              </div>
            )}
            <a href="/" className="inline-block text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline">
              {t('Volver a Habitar')}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
