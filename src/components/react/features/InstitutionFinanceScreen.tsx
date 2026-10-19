import { useEffect, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { HabitarLoader } from '../ui/HabitarLoader';
import { showSuccess, showError } from '../../../lib/alerts';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import {
  getInstitutionFinanceSummary,
  listInstitutionExpenses,
  createInstitutionExpense,
  deleteInstitutionExpense,
  listInstitutionFees,
  createInstitutionFee,
  updateInstitutionFeeStatus,
  getInstitutionFinanceConfig,
  saveInstitutionFinanceConfig,
  testMercadoPagoConnection,
} from '../../../services/financeService';
import type {
  FinanceConfig,
  InstitutionExpense,
  InstitutionFee,
  InstitutionFinanceSummary,
} from '../../../types/finance';

type Tab = 'cuotas' | 'gastos' | 'config';

export function InstitutionFinanceScreen() {
  const session = useAuthGuard(['coordinador', 'admin']);
  const institutionId = session?.user.institutionId || 'inst_san_martin';

  const [activeTab, setActiveTab] = useState<Tab>('cuotas');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InstitutionFinanceSummary | null>(null);
  const [fees, setFees] = useState<InstitutionFee[]>([]);
  const pagedFees = usePagination(fees, 15, null);
  const [expenses, setExpenses] = useState<InstitutionExpense[]>([]);
  const pagedExpenses = usePagination(expenses, 15, null);
  const [config, setConfig] = useState<FinanceConfig | null>(null);

  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [testingMp, setTestingMp] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [feeForm, setFeeForm] = useState({
    title: '',
    period: currentPeriod,
    amountArs: '',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    tutorEmail: '',
    tutorName: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    category: 'MANTENIMIENTO',
    title: '',
    description: '',
    amountArs: '',
    supplier: '',
    invoiceNumber: '',
    status: 'PAGADO',
  });

  const [mpForm, setMpForm] = useState({
    mpAccessToken: '',
    mpPublicKey: '',
    mpIsSandbox: true,
  });

  const loadData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [sumData, feeData, expData, cfgData] = await Promise.all([
        getInstitutionFinanceSummary(institutionId).catch(() => null),
        listInstitutionFees(institutionId).catch(() => []),
        listInstitutionExpenses(institutionId).catch(() => []),
        getInstitutionFinanceConfig(institutionId).catch(() => null),
      ]);
      setSummary(sumData);
      setFees(feeData);
      setExpenses(expData);
      setConfig(cfgData);
      if (cfgData) {
        setMpForm({
          mpAccessToken: cfgData.mpAccessToken || '',
          mpPublicKey: cfgData.mpPublicKey || '',
          mpIsSandbox: cfgData.mpIsSandbox ?? true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.title || !feeForm.amountArs || !feeForm.dueDate) {
      showError('Datos incompletos', 'Completá título, importe y fecha de vencimiento.');
      return;
    }
    try {
      const created = await createInstitutionFee(institutionId, {
        title: feeForm.title,
        period: feeForm.period,
        amountArs: Number(feeForm.amountArs),
        dueDate: feeForm.dueDate,
        tutorEmail: feeForm.tutorEmail,
        tutorName: feeForm.tutorName,
      });
      setIsFeeModalOpen(false);
      showSuccess(
        'Cuota Creada con Mercado Pago',
        'Se generó el enlace de pago de Mercado Pago. Podés compartirlo directamente con la familia.'
      );
      setFeeForm({
        title: '',
        period: currentPeriod,
        amountArs: '',
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        tutorEmail: '',
        tutorName: '',
      });
      loadData();
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo crear la cuota');
    }
  };

  const handleToggleFeeStatus = async (fee: InstitutionFee) => {
    const nextStatus = fee.status === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';
    try {
      await updateInstitutionFeeStatus(institutionId, fee.id, nextStatus);
      showSuccess('Estado actualizado', `La cuota ahora figura como ${nextStatus}.`);
      loadData();
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo actualizar el estado.');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amountArs) {
      showError('Datos incompletos', 'Ingresá el título y monto del gasto.');
      return;
    }
    try {
      await createInstitutionExpense(institutionId, {
        category: expenseForm.category,
        title: expenseForm.title,
        description: expenseForm.description,
        amountArs: Number(expenseForm.amountArs),
        supplier: expenseForm.supplier,
        invoiceNumber: expenseForm.invoiceNumber,
        status: expenseForm.status,
      });
      setIsExpenseModalOpen(false);
      showSuccess('Gasto registrado', 'El gasto escolar fue registrado con éxito.');
      setExpenseForm({
        category: 'MANTENIMIENTO',
        title: '',
        description: '',
        amountArs: '',
        supplier: '',
        invoiceNumber: '',
        status: 'PAGADO',
      });
      loadData();
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo registrar el gasto.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este registro de gasto escolar?')) return;
    try {
      await deleteInstitutionExpense(institutionId, id);
      showSuccess('Eliminado', 'Gasto eliminado con éxito.');
      loadData();
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo eliminar el gasto.');
    }
  };

  const handleSaveMpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await saveInstitutionFinanceConfig(institutionId, mpForm);
      showSuccess('Configuración guardada', 'Credenciales de Mercado Pago para el colegio guardadas.');
      loadData();
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo guardar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestMp = async () => {
    if (!mpForm.mpAccessToken) {
      showError('Falta Token', 'Ingresá el Access Token de la cuenta de Mercado Pago del colegio.');
      return;
    }
    setTestingMp(true);
    try {
      const res = await testMercadoPagoConnection(mpForm.mpAccessToken);
      if (res.success) {
        showSuccess('Conexión Exitosa', res.message);
      } else {
        showError('Fallo de Conexión', res.message);
      }
    } catch (err: any) {
      showError('Error', err.message || 'Error al conectar con Mercado Pago');
    } finally {
      setTestingMp(false);
    }
  };

  const formatMoney = (amount: number) => {
    return `$${amount.toLocaleString('es-AR')}`;
  };

  if (!session || loading) {
    return <HabitarLoader size="lg" message="Cargando cuotas y finanzas institucionales..." />;
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-pri">
            Finanzas Institucionales
          </h1>
          <p className="text-xs sm:text-sm text-text-sec mt-0.5">
            Gestión de cuotas escolares con cobro Mercado Pago y control de gastos operativos del colegio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-gray-bg border border-gray-border rounded-lg text-xs font-semibold text-text-pri transition-colors shadow-2xs"
          >
            <Icon name="plus" size={14} />
            <span>Nuevo Gasto</span>
          </button>
          <button
            onClick={() => setIsFeeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Icon name="creditCard" size={14} />
            <span>Emitir Cuota MP</span>
          </button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-border rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-sec">Cobranzas Recaudadas</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Icon name="trendingUp" size={16} />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-2">
            {formatMoney(summary?.totalCollectedArs || 0)}
          </div>
          <div className="text-[11px] text-text-sec mt-1">
            {summary?.paidFeesCount || 0} cuotas cobradas
          </div>
        </div>

        <div className="bg-white border border-gray-border rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-sec">Cuotas Pendientes</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Icon name="clock" size={16} />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {formatMoney(summary?.totalPendingArs || 0)}
          </div>
          <div className="text-[11px] text-text-sec mt-1">
            {summary?.overdueFeesCount ? `${summary.overdueFeesCount} vencidas` : 'Al día'}
          </div>
        </div>

        <div className="bg-white border border-gray-border rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-sec">Gastos del Colegio</span>
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <Icon name="trendingDown" size={16} />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-red-700 mt-2">
            {formatMoney(summary?.totalExpensesArs || 0)}
          </div>
          <div className="text-[11px] text-text-sec mt-1">Mantenimiento, insumos y servicios</div>
        </div>

        <div className="bg-white border border-gray-border rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-sec">Balance Neto Escolar</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Icon name="wallet" size={16} />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-text-pri mt-2">
            {formatMoney(summary?.netBalanceArs || 0)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">Superávit del período</div>
        </div>
      </div>

      {}
      <div className="flex items-center gap-1 border-b border-gray-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('cuotas')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cuotas'
              ? 'border-emerald-700 text-emerald-700'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon name="dollarSign" size={15} />
            Cobranzas & Cuotas Escolares ({fees.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'gastos'
              ? 'border-emerald-700 text-emerald-700'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon name="trendingDown" size={15} />
            Gastos de la Institución ({expenses.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-emerald-700 text-emerald-700'
              : 'border-transparent text-text-sec hover:text-text-pri'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon name="creditCard" size={15} />
            Cuenta de Cobro Mercado Pago
          </span>
        </button>
      </div>

      {}
      {activeTab === 'cuotas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-sec">
              Cuotas emitidas a familias y tutores
            </span>
            <button
              onClick={() => setIsFeeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              <Icon name="plus" size={13} />
              <span>Emitir Cuota</span>
            </button>
          </div>

          <div className="bg-white border border-gray-border rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-border bg-surface text-text-sec font-semibold">
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4">Tutor / Familia</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Link Mercado Pago</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border">
                  {fees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-sec">
                        No hay cuotas emitidas todavía. Hacé clic en &quot;Emitir Cuota&quot; para comenzar.
                      </td>
                    </tr>
                  ) : (
                    pagedFees.pageItems.map((fee) => (
                      <tr key={fee.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-pri">{fee.title}</td>
                        <td className="py-3 px-4 text-text-sec">{fee.period}</td>
                        <td className="py-3 px-4">
                          <div className="text-text-pri font-medium">{fee.tutorName || 'Tutor registrado'}</div>
                          <div className="text-[10.5px] text-text-sec">{fee.tutorEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-text-sec whitespace-nowrap">
                          {new Date(fee.dueDate).toLocaleDateString('es-AR')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-text-pri whitespace-nowrap">
                          {formatMoney(fee.amountArs)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              fee.status === 'PAGADO'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {fee.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {fee.mpInitPoint ? (
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={fee.mpInitPoint}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline font-semibold"
                              >
                                Pagar
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(fee.mpInitPoint || '');
                                  showSuccess('Link Copiado', 'Enlace de Mercado Pago copiado para enviar a la familia.');
                                }}
                                className="p-1 text-text-sec hover:text-text-pri"
                                title="Copiar link"
                              >
                                <Icon name="copy" size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-text-ter">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleFeeStatus(fee)}
                            className="px-2 py-1 rounded border border-gray-border hover:bg-surface text-[11px] font-medium text-text-pri transition-colors"
                          >
                            {fee.status === 'PAGADO' ? 'Marcar Pendiente' : 'Marcar Pagado'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={pagedFees.page} totalPages={pagedFees.totalPages} total={pagedFees.total} pageSize={pagedFees.pageSize} onChange={pagedFees.setPage} label="cuotas" />
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-sec">
              Egresos y compras de la institución escolar
            </span>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              <Icon name="plus" size={13} />
              <span>Nuevo Gasto</span>
            </button>
          </div>

          <div className="bg-white border border-gray-border rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-border bg-surface text-text-sec font-semibold">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Proveedor / Factura</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-sec">
                        No hay gastos escolares registrados.
                      </td>
                    </tr>
                  ) : (
                    pagedExpenses.pageItems.map((exp) => (
                      <tr key={exp.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 text-text-sec whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString('es-AR')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-text-pri">{exp.title}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-bg text-text-sec">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-sec">
                          {exp.supplier || '—'} {exp.invoiceNumber ? `(${exp.invoiceNumber})` : ''}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-red-700 whitespace-nowrap">
                          -{formatMoney(exp.amountArs)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-text-sec hover:text-red transition-colors"
                            title="Eliminar gasto"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={pagedExpenses.page} totalPages={pagedExpenses.totalPages} total={pagedExpenses.total} pageSize={pagedExpenses.pageSize} onChange={pagedExpenses.setPage} label="gastos" />
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'config' && (
        <div className="max-w-2xl bg-white border border-gray-border rounded-xl p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-text-pri">
              Cuenta de Mercado Pago de la Institución
            </h3>
            <p className="text-xs text-text-sec mt-1">
              Podés configurar la cuenta propia de Mercado Pago de tu colegio para que el dinero de las cuotas ingrese directamente a su cuenta bancaria.
            </p>
          </div>

          <form onSubmit={handleSaveMpConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">
                Access Token de la Escuela
              </label>
              <input
                type="password"
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx..."
                value={mpForm.mpAccessToken}
                onChange={(e) => setMpForm({ ...mpForm, mpAccessToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1">
                Public Key de la Escuela (Opcional)
              </label>
              <input
                type="text"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                value={mpForm.mpPublicKey}
                onChange={(e) => setMpForm({ ...mpForm, mpPublicKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="school-sandbox"
                checked={mpForm.mpIsSandbox}
                onChange={(e) => setMpForm({ ...mpForm, mpIsSandbox: e.target.checked })}
                className="rounded text-emerald-700"
              />
              <label htmlFor="school-sandbox" className="text-xs font-medium text-text-pri">
                Entorno de pruebas (Sandbox)
              </label>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
              </button>
              <button
                type="button"
                onClick={handleTestMp}
                disabled={testingMp}
                className="px-4 py-2 border border-gray-border hover:bg-surface rounded-lg text-xs font-semibold text-text-pri disabled:opacity-50 flex items-center gap-1.5"
              >
                <Icon name="refresh" size={13} className={testingMp ? 'animate-spin' : ''} />
                <span>{testingMp ? 'Probando...' : 'Probar Token'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-border">
              <h3 className="text-base font-bold text-text-pri">Emitir Cuota con Mercado Pago</h3>
              <button onClick={() => setIsFeeModalOpen(false)} className="p-1 text-text-sec hover:text-text-pri">
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuota Marzo 2026 - Primaria"
                  value={feeForm.title}
                  onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">Período</label>
                  <input
                    type="text"
                    required
                    placeholder="2026-03"
                    value={feeForm.period}
                    onChange={(e) => setFeeForm({ ...feeForm, period: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">Importe (ARS)</label>
                  <input
                    type="number"
                    required
                    placeholder="45000"
                    value={feeForm.amountArs}
                    onChange={(e) => setFeeForm({ ...feeForm, amountArs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  required
                  value={feeForm.dueDate}
                  onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Email del Tutor o Familia</label>
                <input
                  type="email"
                  placeholder="familia@ejemplo.com"
                  value={feeForm.tutorEmail}
                  onChange={(e) => setFeeForm({ ...feeForm, tutorEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Nombre del Tutor o Alumno</label>
                <input
                  type="text"
                  placeholder="Familia Gómez / Alumno Juan Gómez"
                  value={feeForm.tutorName}
                  onChange={(e) => setFeeForm({ ...feeForm, tutorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="px-4 py-2 border border-gray-border rounded-lg text-xs font-semibold text-text-sec hover:text-text-pri"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Icon name="creditCard" size={13} />
                  <span>Emitir y Generar Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-border">
              <h3 className="text-base font-bold text-text-pri">Registrar Gasto de la Escuela</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-1 text-text-sec hover:text-text-pri">
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">Concepto / Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Reparación eléctrica salón 4"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">Monto (ARS)</label>
                  <input
                    type="number"
                    required
                    placeholder="35000"
                    value={expenseForm.amountArs}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amountArs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">Categoría</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs form-select"
                  >
                    <option value="MANTENIMIENTO">Mantenimiento Edilicio</option>
                    <option value="MATERIAL_DIDACTICO">Material Didáctico</option>
                    <option value="PLATAFORMAS_SOFTWARE">Plataformas & Software</option>
                    <option value="SERVICIOS">Servicios (Luz, Internet)</option>
                    <option value="EVENTOS">Actos y Eventos</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">Proveedor</label>
                  <input
                    type="text"
                    placeholder="Librería / Electricista"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-pri mb-1">N° Factura</label>
                  <input
                    type="text"
                    placeholder="FAC-00124"
                    value={expenseForm.invoiceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-gray-border rounded-lg text-xs font-semibold text-text-sec hover:text-text-pri"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
