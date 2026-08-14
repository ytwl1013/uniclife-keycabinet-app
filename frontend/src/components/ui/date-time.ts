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

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

export function toDeviceDateTimeLocalValue(isoUtc: string) {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function fromDeviceDateTimeLocalValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
    || date.getHours() !== Number(hour)
    || date.getMinutes() !== Number(minute)
  ) return undefined;
  return date.toISOString();
}

export function mergeDeviceDateTimePickerPart(
  currentIsoUtc: string,
  selectedIsoUtc: string,
  part: 'date' | 'time',
) {
  const current = new Date(currentIsoUtc);
  const selected = new Date(selectedIsoUtc);
  if (Number.isNaN(current.getTime()) || Number.isNaN(selected.getTime())) return undefined;

  const next = new Date(current);
  if (part === 'date') {
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  } else {
    // Android/iOS time-only pickers may report 1970 for the date portion. Only
    // copy the wall-clock time so the already selected year/month/day survives.
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  }
  return Number.isNaN(next.getTime()) ? undefined : next.toISOString();
}

export function isExpectedReturnAfter(checkedOutAt: string, expectedReturnAt: string) {
  const checkedOut = Date.parse(checkedOutAt);
  const expectedReturn = Date.parse(expectedReturnAt);
  return Number.isFinite(checkedOut) && Number.isFinite(expectedReturn) && expectedReturn > checkedOut;
}
