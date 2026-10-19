/** Fechas de las actividades en hora argentina (UTC−3, sin horario de verano). */
const TZ = 'America/Argentina/Buenos_Aires';

export function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Instante de una fecha y hora argentinas (AAAA-MM-DD, HH:mm), o null si no son válidas. */
export function arInstant(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const t = Date.parse(`${date}T${time}:00-03:00`);
  return Number.isNaN(t) ? null : t;
}

/** «hoy», «mañana» o «jue 22/10», según la fecha. */
export function dayLabel(date: string): string {
  const today = todayAR();
  if (date === today) return 'hoy';
  if (date === addDays(today, 1)) return 'mañana';
  if (date === addDays(today, -1)) return 'ayer';
  const d = new Date(`${date}T12:00:00-03:00`);
  const weekday = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: TZ }).replace('.', '');
  return `${weekday} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** «10:00 h» si es hoy, o «mañana 10:00 h» / «jue 22/10 10:00 h» si es otro día. */
export function whenLabel(date: string, time: string): string {
  return date === todayAR() ? `${time} h` : `${dayLabel(date)} ${time} h`;
}

/** Duración legible entre dos instantes: «45 min», «4 h», «1 día y 2 h». */
export function durationLabel(fromMs: number, toMs: number): string {
  const minutes = Math.round((toMs - fromMs) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(days === 1 ? '1 día' : `${days} días`);
  if (hours) parts.push(`${hours} h`);
  if (mins && !days) parts.push(`${mins} min`);
  return parts.join(' y ');
}

export { addDays };
