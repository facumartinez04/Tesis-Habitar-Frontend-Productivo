export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export function deltaPts(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value} pts`;
}
