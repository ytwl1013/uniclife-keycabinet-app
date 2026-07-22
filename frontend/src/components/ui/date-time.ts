function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function offsetAt(date: Date, timeZone: string) {
  const parts = dateParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallClockAsUtc - date.getTime();
}

export function toDateTimeLocalValue(isoUtc: string, timeZone: string) {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '';
  const parts = dateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromDateTimeLocalValue(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  const wallClockAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let result = new Date(wallClockAsUtc);
  result = new Date(wallClockAsUtc - offsetAt(result, timeZone));
  result = new Date(wallClockAsUtc - offsetAt(result, timeZone));
  if (Number.isNaN(result.getTime())) return undefined;

  const iso = result.toISOString();
  return toDateTimeLocalValue(iso, timeZone) === value ? iso : undefined;
}

export function mergeDateTimePickerPart(
  currentIsoUtc: string,
  selectedIsoUtc: string,
  timeZone: string,
  part: 'date' | 'time',
) {
  const current = toDateTimeLocalValue(currentIsoUtc, timeZone);
  const selected = toDateTimeLocalValue(selectedIsoUtc, timeZone);
  if (!current || !selected) return undefined;

  const next = part === 'date'
    ? `${selected.slice(0, 10)}T${current.slice(11, 16)}`
    : `${current.slice(0, 10)}T${selected.slice(11, 16)}`;

  return fromDateTimeLocalValue(next, timeZone);
}

export function isExpectedReturnAfter(checkedOutAt: string, expectedReturnAt: string) {
  const checkedOut = Date.parse(checkedOutAt);
  const expectedReturn = Date.parse(expectedReturnAt);
  return Number.isFinite(checkedOut) && Number.isFinite(expectedReturn) && expectedReturn > checkedOut;
}
