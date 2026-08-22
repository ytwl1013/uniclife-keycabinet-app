import {
  checkoutKeyRequestSchema,
  registerRequestSchema,
  updateKeyRequestSchema,
} from '@uniclife/shared';
import { describe, expect, it } from 'vitest';

describe('backend request contracts', () => {
  it('normalizes registration email and enforces legal consent', () => {
    const valid = registerRequestSchema.parse({
      email: ' Person@Example.COM ',
      password: 'password-123',
      displayName: 'Test Person',
      locale: 'en-US',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(valid.email).toBe('person@example.com');
    expect(() =>
      registerRequestSchema.parse({ ...valid, acceptedPrivacy: false }),
    ).toThrow();
  });

  it('requires an actual key edit and validates expected return timestamps', () => {
    expect(() => updateKeyRequestSchema.parse({ requestId: 'request-123' })).toThrow();
    expect(() =>
      checkoutKeyRequestSchema.parse({
        borrowerName: '',
        expectedReturnAt: 'not-a-date',
      }),
    ).toThrow();
  });
});
