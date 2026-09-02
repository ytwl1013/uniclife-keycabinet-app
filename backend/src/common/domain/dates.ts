export function toIsoDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('Database timestamp is invalid');
  }
  return parsed.toISOString();
}
