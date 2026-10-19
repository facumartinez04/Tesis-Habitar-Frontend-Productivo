/** Puntaje de un eje para mostrar: «—» si no se midió, nunca un valor inventado. */
export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/** Diferencia en puntos con signo, o «—» si falta alguno de los dos valores. */
export function deltaPts(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value} pts`;
}
