/**
 * Identificador anónimo del dispositivo del alumno. Vincula el número de lista (o el nombre) con un equipo
 * dentro del aula, para que nadie responda a nombre de otro desde otro dispositivo. No contiene datos personales.
 */
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('habitar_device_id');
    if (!deviceId) {
      deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      localStorage.setItem('habitar_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_browser_fallback';
  }
}

/** Cómo se identifica el alumno en la institución: número de lista (por defecto) o nombre y apellido. */
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
        hint: 'No necesitás cuenta ni contraseña.',
      };
}
