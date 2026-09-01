import {
  checkoutKeyRequestSchema,
  cabinetMembershipSchema,
  currentUserAccountSchema,
  feedbackHistoryQuerySchema,
  feedbackRecordSchema,
  feedbackRequestSchema,
  markHomeGuidePromptedRequestSchema,
  realtimeEventSchema,
  registerRequestSchema,
  updateKeyRequestSchema,
  transferCabinetSuperAdminRequestSchema,
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

  it('keeps realtime change notifications small and resource-scoped', () => {
    const event = realtimeEventSchema.parse({
      type: 'workspace.changed',
      eventId: 'realtime-test',
      occurredAt: '2026-08-24T08:00:00.000Z',
      cabinetId: 'cabinet-test',
      cabinetVersion: 7,
      resources: ['keys', 'loans', 'events'],
    });

    expect(event).toMatchObject({ cabinetVersion: 7, resources: ['keys', 'loans', 'events'] });
    expect(() => realtimeEventSchema.parse({ ...event, resources: [] })).toThrow();
  });

  it('distinguishes the single Super Admin role and validates transfer targets', () => {
    const baseMembership = {
      id: 'membership-test',
      cabinetId: 'cabinet-test',
      userId: 'user-test',
      active: true,
      joinedAt: '2026-08-24T08:00:00.000Z',
    };
    expect(cabinetMembershipSchema.parse({
      ...baseMembership,
      role: 'super_admin',
    }).role).toBe('super_admin');
    expect(cabinetMembershipSchema.parse({ ...baseMembership, role: 'admin' }).role).toBe('admin');
    expect(() => cabinetMembershipSchema.parse({ ...baseMembership, role: 'owner' })).toThrow();
    expect(transferCabinetSuperAdminRequestSchema.parse({
      membershipId: 'membership-next',
      requestId: 'transfer-request-1',
    }).membershipId).toBe('membership-next');
  });

  it('validates feedback content and compressed image boundaries', () => {
    const valid = feedbackRequestSchema.parse({
      content: 'The return action failed after confirmation.',
      images: [
        {
          data: 'aGVsbG8=',
          fileName: 'feedback-1.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });

    expect(valid).toMatchObject({ type: 'application', salutation: '', title: '' });
    expect(() => feedbackRequestSchema.parse({ content: '   ' })).toThrow();
    expect(() =>
      feedbackRequestSchema.parse({
        content: 'Too many images',
        images: Array.from({ length: 6 }, (_, index) => ({
          data: 'aGVsbG8=',
          fileName: `feedback-${index}.jpg`,
          mimeType: 'image/jpeg',
        })),
      }),
    ).toThrow();
  });

  it('keeps feedback history status and identity snapshots stable', () => {
    const record = feedbackRecordSchema.parse({
      id: 'feedback-test',
      userId: 'user-test',
      userDisplayName: 'Test Person',
      userEmail: 'PERSON@example.com',
      salutation: 'Test',
      type: 'product',
      title: 'Door sensor',
      content: 'The door state did not refresh.',
      imageCount: 2,
      status: 'sent',
      failureCode: null,
      submittedAt: '2026-08-24T08:00:00.000Z',
      deliveredAt: '2026-08-24T08:00:01.000Z',
    });

    expect(record.userEmail).toBe('person@example.com');
    expect(feedbackHistoryQuerySchema.parse({}).limit).toBe(50);
    expect(() => feedbackHistoryQuerySchema.parse({ limit: 101 })).toThrow();
  });
});
