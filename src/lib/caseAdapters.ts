export function toLower<T extends string>(value: string): T {
  return value.toLowerCase() as T;
}

export function toUpper<T extends string>(value: string): T {
  return value.toUpperCase() as T;
}
