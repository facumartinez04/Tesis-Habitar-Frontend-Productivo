import { t } from '../i18n';

let sessionDeviceId: string | null = null;

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('habitar_device_id');
    if (!deviceId) {
      deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      localStorage.setItem('habitar_device_id', deviceId);
    }
    return deviceId;
  } catch {
    sessionDeviceId ??= `tmp_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
    return sessionDeviceId;
  }
}

export type StudentIdMode = 'lista' | 'nombre';

export function studentIdLabel(mode: StudentIdMode): { title: string; placeholder: string; hint: string } {
  return mode === 'lista'
    ? {
        title: t('¿Cuál es tu número de lista?'),
        placeholder: t('Ej: 12'),
        hint: t('No necesitás cuenta ni contraseña, y no se pide tu nombre.'),
      }
    : {
        title: t('¡Hola! ¿Cómo te llamás?'),
        placeholder: t('Nombre y apellido'),
        hint: t('Escribí tu nombre y tu apellido. No necesitás cuenta ni contraseña.'),
      };
}
