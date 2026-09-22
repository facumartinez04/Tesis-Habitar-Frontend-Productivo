import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { sessionStore } from '../../../store/sessionStore';
import { listInstitutions } from '../../../services/institutionService';
import type { Institution } from '../../../types/institution';

export function ImpersonationBanner() {
  const session = useStore(sessionStore);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'coordinador' | 'director' | 'docente'>('coordinador');

  const isGlobalAdmin = session?.user.role === 'admin' || !!session?.impersonatedInstitutionId;
  const isImpersonating = !!session?.impersonatedInstitutionId;

  useEffect(() => {
    if (session?.user.role === 'admin') {
      listInstitutions().then(setInstitutions).catch(() => {});
    }
  }, [session?.user.role]);

  if (!isGlobalAdmin) return null;

  function handleStartImpersonate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstId || !session) return;

    const targetInst = institutions.find((i) => i.id === selectedInstId);
    if (!targetInst) return;

    sessionStore.set({
      ...session,
      impersonatedInstitutionId: targetInst.id,
      impersonatedInstitutionName: targetInst.name,
      impersonatedRole: selectedRole,
    });

    setIsOpen(false);

    if (selectedRole === 'docente') {
      window.location.href = '/docente/cursos';
    } else {
      window.location.href = '/institucional';
    }
  }

  function handleStopImpersonate() {
    if (!session) return;
    sessionStore.set({
      ...session,
      impersonatedInstitutionId: undefined,
      impersonatedInstitutionName: undefined,
      impersonatedRole: undefined,
    });
    window.location.href = '/admin/instituciones';
  }

  return (
    <>
      {isImpersonating ? (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-amber-600/30 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-900"></span>
            </span>
            <span>
              <strong>Modo Vista Activo:</strong> Estás navegando como <strong>{session.impersonatedRole?.toUpperCase()}</strong> en <strong>{session.impersonatedInstitutionName}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/institucional"
              className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded text-amber-950 font-semibold transition-colors"
            >
              Dashboard Institucional
            </a>
            <a
              href="/docente/cursos"
              className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded text-amber-950 font-semibold transition-colors"
            >
              Vista Cursos
            </a>
            <button
              onClick={() => setIsOpen(true)}
              className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded text-amber-950 font-semibold transition-colors"
            >
              Cambiar Institución / Rol
            </button>
            <button
              onClick={handleStopImpersonate}
              className="px-2.5 py-1 bg-amber-900 text-white hover:bg-black rounded font-bold transition-colors shadow-xs"
            >
              ✕ Salir a Admin Global
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-900/90 text-emerald-100 px-4 py-1.5 text-xs flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Panel de Super Administrador Global</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Ver como Institución / Rol</span>
          </button>
        </div>
      )}

      {}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-border">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-text-pri flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Ingresar como Institución / Negocio
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-ter hover:text-text-pri p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-sec leading-relaxed">
              Como Administrador podés entrar a cualquier colegio dado de alta y ver métricas, cursos, alumnos, alertas y configuración exactamente como lo ve su equipo.
            </p>

            <form onSubmit={handleStartImpersonate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Elegí la Institución Educativa:
                </label>
                <select
                  required
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="w-full border border-gray-border rounded-lg px-3 py-2 text-xs bg-surface text-text-pri focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Seleccionar institución --</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-pri mb-1">
                  Ver con el rol de:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'coordinador', label: 'Coordinador', desc: 'Panel directivo' },
                    { id: 'director', label: 'Director', desc: 'Supervisión' },
                    { id: 'docente', label: 'Docente', desc: 'Cursos & Actividades' },
                  ].map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRole(r.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === r.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                          : 'border-gray-border bg-white text-text-sec hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs">{r.label}</div>
                      <div className="text-[10px] text-text-ter font-normal">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-border text-xs rounded-lg text-text-sec hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedInstId}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Entrar a la Institución →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
