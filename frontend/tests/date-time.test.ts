import {
  fromDateTimeLocalValue,
  isExpectedReturnAfter,
  mergeDateTimePickerPart,
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

  it('merges Android picker parts in the cabinet timezone instead of the device timezone', () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';

    try {
      const withSelectedDate = mergeDateTimePickerPart(
        '2026-07-21T13:45:00.000Z',
        '2026-11-02T17:00:00.000Z',
        'America/New_York',
        'date',
      );
      expect(withSelectedDate).toBe('2026-11-02T14:45:00.000Z');

      expect(mergeDateTimePickerPart(
        withSelectedDate!,
        '2026-11-02T22:30:00.000Z',
        'America/New_York',
        'time',
      )).toBe('2026-11-02T22:30:00.000Z');
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it('keeps the cabinet wall time when the selected date crosses a daylight-saving boundary', () => {
    expect(mergeDateTimePickerPart(
      '2026-03-07T14:00:00.000Z',
      '2026-03-08T16:00:00.000Z',
      'America/New_York',
      'date',
    )).toBe('2026-03-08T13:00:00.000Z');
  });

  it('rejects wall-clock values that do not exist during a daylight-saving jump', () => {
    expect(fromDateTimeLocalValue('2026-03-08T02:30', 'America/New_York')).toBeUndefined();
  });

  it('rejects malformed values and requires return after check-out', () => {
    expect(fromDateTimeLocalValue('21/07/2026 11:30', 'Europe/Berlin')).toBeUndefined();
    expect(isExpectedReturnAfter('2026-07-21T09:00:00.000Z', '2026-07-21T10:00:00.000Z')).toBe(true);
    expect(isExpectedReturnAfter('2026-07-21T09:00:00.000Z', '2026-07-21T09:00:00.000Z')).toBe(false);
  });
});
