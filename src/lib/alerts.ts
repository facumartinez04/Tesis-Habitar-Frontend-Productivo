import Swal from 'sweetalert2';

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
    confirmButtonText: options.confirmButtonText ?? 'Sí, continuar',
    cancelButtonText: 'Cancelar',
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
    confirmButtonText: options.confirmButtonText ?? 'Confirmar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export function showError(title: string, text?: string): Promise<unknown> {
  return themed.fire({ icon: 'error', title, text });
}

export function showSuccess(title: string, text?: string): Promise<unknown> {
  return themed.fire({ icon: 'success', title, text, timer: 2200, showConfirmButton: false });
}
