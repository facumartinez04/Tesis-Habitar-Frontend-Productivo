import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { ensureAdminSession } from '../../../services/authService';
import { createInstitution } from '../../../services/institutionService';
import type { EducationLevel, InstitutionStatus } from '../../../types/institution';

export function NewInstitutionScreen() {
  const { message, showToast } = useToast();
  const [name, setName] = useState('Colegio San Martín');
  const [domain, setDomain] = useState('');
  const [levels, setLevels] = useState<EducationLevel[]>(['primario', 'secundario']);
  const [status, setStatus] = useState<InstitutionStatus>('activo');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureAdminSession();
  }, []);

  function toggleLevel(level: EducationLevel) {
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  const isValid = name.trim() && domain.trim() && coordinatorEmail.trim() && levels.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    await createInstitution({ name, domain, levels, status, coordinatorEmail });
    setSubmitting(false);
    showToast('Institución creada e invitación OAuth enviada');
    setDomain('');
    setCoordinatorEmail('');
  }

  return (
    <div>
      <Toast message={message} />
      <div className="text-lg font-semibold text-text-pri mb-[3px] tracking-tight">Alta de institución</div>
      <div className="text-[12.5px] text-text-sec mb-[18px]">Aprovisioná un nuevo tenant en la plataforma</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Nombre de la institución</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]" />
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Dominio institucional</label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="@colegio.edu.ar"
            className="w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Niveles educativos</label>
          <div className="flex flex-col gap-1.5 py-2">
            <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
              <input type="checkbox" checked={levels.includes('primario')} onChange={() => toggleLevel('primario')} /> Primario
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
              <input type="checkbox" checked={levels.includes('secundario')} onChange={() => toggleLevel('secundario')} /> Secundario
            </label>
          </div>
        </div>
        <div className="form-group">
          <label className="block text-[11px] text-text-sec mb-[5px] font-medium">Estado inicial</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InstitutionStatus)}
            className="form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
          >
            <option value="activo">Activo</option>
            <option value="piloto_no_confirmado">Piloto no confirmado</option>
          </select>
        </div>
      </div>

      <div className="form-group mb-3.5">
        <label className="block text-[11px] text-text-sec mb-[5px] font-medium">
          Email del/la coordinador/a (recibirá la invitación OAuth)
        </label>
        <input
          value={coordinatorEmail}
          onChange={(e) => setCoordinatorEmail(e.target.value)}
          placeholder="coordinador@colegio.edu.ar"
          className="w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px]"
        />
      </div>

      <div className="bg-green-bg rounded-[6px] px-3.5 py-2.5 mb-4 text-[12.5px] text-green-text flex items-center gap-2">
        <Icon name="mail" size={15} />
        Al confirmar, se enviará automáticamente la invitación de configuración OAuth al coordinador/a.
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={() => { setName(''); setDomain(''); setCoordinatorEmail(''); }}
          className="bg-white border border-gray-border rounded-[6px] px-3.5 py-2 text-[12.5px]"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="bg-green-dark text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear institución y enviar invitación'}
        </button>
      </div>
    </div>
  );
}
