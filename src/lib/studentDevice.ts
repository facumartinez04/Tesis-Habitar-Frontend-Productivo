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
        title: '¿Cuál es tu número de lista?',
        placeholder: 'Ej: 12',
        hint: 'No necesitás cuenta ni contraseña, y no se pide tu nombre.',
      }
    : {
        title: '¡Hola! ¿Cómo te llamás?',
        placeholder: 'Nombre y apellido',
        hint: 'Escribí tu nombre y tu apellido. No necesitás cuenta ni contraseña.',
      };
}
