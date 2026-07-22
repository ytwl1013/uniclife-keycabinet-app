import {
  fromDateTimeLocalValue,
  isExpectedReturnAfter,
  toDateTimeLocalValue,
} from '../src/components/ui/date-time';

describe('local cabinet date and time fields', () => {
  it('displays cabinet wall-clock time and submits ISO UTC', () => {
    const iso = '2026-07-21T09:30:00.000Z';
    expect(toDateTimeLocalValue(iso, 'Europe/Berlin')).toBe('2026-07-21T11:30');
    expect(fromDateTimeLocalValue('2026-07-21T11:30', 'Europe/Berlin')).toBe(iso);
  });

  it('respects daylight-saving offsets in another cabinet timezone', () => {
    expect(fromDateTimeLocalValue('2026-01-15T09:00', 'America/New_York')).toBe('2026-01-15T14:00:00.000Z');
    expect(fromDateTimeLocalValue('2026-07-15T09:00', 'America/New_York')).toBe('2026-07-15T13:00:00.000Z');
  });

  it('rejects malformed values and requires return after check-out', () => {
    expect(fromDateTimeLocalValue('21/07/2026 11:30', 'Europe/Berlin')).toBeUndefined();
    expect(isExpectedReturnAfter('2026-07-21T09:00:00.000Z', '2026-07-21T10:00:00.000Z')).toBe(true);
    expect(isExpectedReturnAfter('2026-07-21T09:00:00.000Z', '2026-07-21T09:00:00.000Z')).toBe(false);
  });
});
