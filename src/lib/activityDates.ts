import { t, intlLocale } from '../i18n';

const TZ = 'America/Argentina/Buenos_Aires';

export function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

export function arInstant(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const ms = Date.parse(`${date}T${time}:00-03:00`);
  return Number.isNaN(ms) ? null : ms;
}

export function dayLabel(date: string): string {
  const today = todayAR();
  if (date === today) return 'hoy';
  if (date === addDays(today, 1)) return t('mañana');
  if (date === addDays(today, -1)) return 'ayer';
  const d = new Date(`${date}T12:00:00-03:00`);
  const weekday = d.toLocaleDateString(intlLocale(), { weekday: 'short', timeZone: TZ }).replace('.', '');
  return `${weekday} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function whenLabel(date: string, time: string): string {
  return date === todayAR() ? `${time} h` : `${dayLabel(date)} ${time} h`;
}

export function durationLabel(fromMs: number, toMs: number): string {
  const minutes = Math.round((toMs - fromMs) / 60000);
  if (minutes < 60) return t('{minutes} min', { minutes });
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(days === 1 ? t('1 día') : t('{days} días', { days }));
  if (hours) parts.push(`${hours} h`);
  if (mins && !days) parts.push(t('{mins} min', { mins }));
  return parts.join(' y ');
}

export { addDays };
