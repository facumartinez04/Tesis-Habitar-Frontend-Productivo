import { t } from '../i18n';

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export function deltaPts(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return t('{value} pts', { value: `${value >= 0 ? '+' : ''}${value}` });
}
