import {
  checkoutKeyRequestSchema,
  currentUserAccountSchema,
  markHomeGuidePromptedRequestSchema,
  registerRequestSchema,
  updateKeyRequestSchema,
  userAccountSchema,
} from '@uniclife/shared';
import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../src/common/domain/dates.js';

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

  it('normalizes PostgreSQL timestamp strings for strict native clients', () => {
    expect(toIsoDate('2026-08-22 04:13:19.022814+00')).toBe(
      '2026-08-22T04:13:19.022Z',
    );
    expect(() => toIsoDate('not-a-database-timestamp')).toThrow(
      'Database timestamp is invalid',
    );
  });

  it('keeps login metadata private to the current-user contract', () => {
    const currentUser = currentUserAccountSchema.parse({
      id: 'user-test',
      email: 'person@example.com',
      displayName: 'Test Person',
      locale: 'en-US',
      status: 'active',
      createdAt: '2026-08-24T08:00:00.000Z',
      loginCount: 1,
      lastLoginAt: '2026-08-24T08:00:00.000Z',
      homeGuidePromptedAt: null,
    });
    const publicUser = userAccountSchema.parse(currentUser);

    expect(currentUser.loginCount).toBe(1);
    expect(publicUser).not.toHaveProperty('loginCount');
    expect(publicUser).not.toHaveProperty('homeGuidePromptedAt');
    expect(markHomeGuidePromptedRequestSchema.parse({ prompted: true }).prompted).toBe(true);
    expect(() => markHomeGuidePromptedRequestSchema.parse({ prompted: false })).toThrow();
  });
});
