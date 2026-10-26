import Swal from 'sweetalert2';
import { t } from '../i18n';

const themed = Swal.mixin({
  confirmButtonColor: '#0F6E56',
  cancelButtonColor: '#8C8A85',
  buttonsStyling: true,
  customClass: {
    popup: 'rounded-xl',
  },
});

export async function confirmDestructive(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
}): Promise<boolean> {
  const result = await themed.fire({
    icon: 'warning',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? t('Sí, continuar'),
    cancelButtonText: t('Cancelar'),
    reverseButtons: true,
    confirmButtonColor: '#E24B4A',
  });
  return result.isConfirmed;
}

export async function confirmAction(options: { title: string; text?: string; confirmButtonText?: string }): Promise<boolean> {
  const result = await themed.fire({
    icon: 'question',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? t('Confirmar'),
    cancelButtonText: t('Cancelar'),
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function promptText(options: { title: string; text?: string; placeholder?: string; confirmButtonText?: string }): Promise<string | null> {
  const result = await themed.fire({
    icon: 'question',
    title: options.title,
    text: options.text,
    input: 'text',
    inputPlaceholder: options.placeholder,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? t('Confirmar'),
    cancelButtonText: t('Cancelar'),
    reverseButtons: true,
  });
  return result.isConfirmed ? String(result.value ?? '') : null;
}

export function showError(title: string, text?: string): Promise<unknown> {
  return themed.fire({ icon: 'error', title, text });
}

export function showSuccess(title: string, text?: string): Promise<unknown> {
  return themed.fire({ icon: 'success', title, text, timer: 2200, showConfirmButton: false });
}
