import {
  adminProductCreateRequestSchema,
  adminProductUpdateRequestSchema,
  adminUserDetailSchema,
  checkoutKeyRequestSchema,
  cabinetMembershipSchema,
  currentUserAccountSchema,
  feedbackHistoryQuerySchema,
  feedbackRecordSchema,
  feedbackReplyRequestSchema,
  feedbackRequestSchema,
  feedbackThreadSchema,
  markHomeGuidePromptedRequestSchema,
  pushTokenRequestSchema,
  realtimeEventSchema,
  registerRequestSchema,
  updateKeyRequestSchema,
  transferCabinetSuperAdminRequestSchema,
  userAccountSchema,
} from '@uniclife/shared';
import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../src/common/domain/dates.js';
import { toSku } from '../src/common/domain/mappers.js';

describe('backend request contracts', () => {
  it('allows product manuals to be omitted while accepting only web links', () => {
    const editable = {
      model: 'BG5163',
      name: 'Key cabinet',
      color: 'Black',
      capacity: 32,
      description: 'Product description',
    };

    expect(adminProductUpdateRequestSchema.parse({
      ...editable,
      expectedVersion: 0,
    }).manualUrl).toBe('');
    expect(adminProductUpdateRequestSchema.parse({
      ...editable,
      expectedVersion: 0,
      manualUrl: '   ',
    }).manualUrl).toBe('');
    expect(adminProductUpdateRequestSchema.parse({
      ...editable,
      expectedVersion: 0,
      manualUrl: 'https://example.com/manual',
    }).manualUrl).toBe('https://example.com/manual');
    expect(() => adminProductUpdateRequestSchema.parse({
      ...editable,
      expectedVersion: 0,
      manualUrl: 'javascript:alert(1)',
    })).toThrow();
    expect(() => adminProductCreateRequestSchema.parse({
      ...editable,
      sku: 'BG5163-BK',
      manualUrl: 'ftp://example.com/manual',
      image: {},
    })).toThrow();

    expect(toSku({
      id: 'sku-test',
      sku: 'BG5163-BK',
      model: editable.model,
      name: editable.name,
      color: editable.color,
      capacity: editable.capacity,
      description: editable.description,
      manualUrl: '',
      imageAsset: 'database',
      imageVersion: 0,
      version: 0,
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
    })).not.toHaveProperty('manualUrl');
  });

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

  it('accepts only native Expo push tokens and supported mobile platforms', () => {
    expect(pushTokenRequestSchema.parse({
      platform: 'ios',
      token: 'ExpoPushToken[test-token_123]',
    })).toMatchObject({ platform: 'ios' });
    expect(() => pushTokenRequestSchema.parse({
      platform: 'web',
      token: 'not-a-push-token',
    })).toThrow();
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

  it('validates admin user details with cabinet state and administrator relationships', () => {
    const detail = adminUserDetailSchema.parse({
      user: {
        id: 'user-test',
        email: 'person@example.com',
        displayName: 'Test Person',
        locale: 'zh-CN',
        status: 'active',
        loginCount: 4,
        lastLoginAt: '2026-09-02T08:00:00.000Z',
        createdAt: '2026-08-20T08:00:00.000Z',
        cabinetCount: 1,
        activeSessionCount: 2,
      },
      cabinets: [
        {
          id: 'cabinet-test',
          name: 'Test Cabinet',
          location: 'Reception',
          timeZone: 'Asia/Shanghai',
          status: 'online',
          lastSyncedAt: '2026-09-02T08:00:00.000Z',
          createdAt: '2026-08-20T08:00:00.000Z',
          version: 3,
          membership: {
            role: 'admin',
            joinedAt: '2026-08-21T08:00:00.000Z',
          },
          product: {
            sku: 'BG5163-BK',
            model: 'BG5163',
            name: 'Key Cabinet',
            color: 'black',
            capacity: 16,
          },
          keyCount: 8,
          borrowedKeyCount: 2,
          administrators: [
            {
              id: 'user-owner',
              displayName: 'Owner',
              email: 'owner@example.com',
              status: 'active',
              role: 'super_admin',
              joinedAt: '2026-08-20T08:00:00.000Z',
            },
          ],
        },
      ],
    });

    expect(detail.cabinets[0]?.administrators[0]?.role).toBe('super_admin');
    expect(() =>
      adminUserDetailSchema.parse({
        ...detail,
        cabinets: [{ ...detail.cabinets[0], borrowedKeyCount: -1 }],
      }),
    ).toThrow();
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

  it('validates support conversations, replies, and realtime user notifications', () => {
    const message = {
      id: 'feedback-message-test',
      feedbackId: 'feedback-test',
      sender: 'support',
      senderDisplayName: 'UnicLife Support',
      content: 'Please send the cabinet status shown in Settings.',
      imageCount: 0,
      status: 'sent',
      failureCode: null,
      createdAt: '2026-08-24T09:00:00.000Z',
      readAt: null,
    } as const;
    const thread = feedbackThreadSchema.parse({
      id: 'feedback-test',
      userId: 'user-test',
      userDisplayName: 'Test Person',
      userEmail: 'person@example.com',
      salutation: 'Test',
      type: 'application',
      title: 'Cabinet status',
      content: 'The cabinet appears offline.',
      imageCount: 0,
      status: 'sent',
      failureCode: null,
      submittedAt: '2026-08-24T08:00:00.000Z',
      deliveredAt: '2026-08-24T08:00:01.000Z',
      conversationStatus: 'waiting_for_user',
      lastMessageAt: message.createdAt,
      lastMessagePreview: message.content,
      lastMessageSender: 'support',
      latestSupportMessageAt: message.createdAt,
      latestSupportMessagePreview: message.content,
      messageCount: 1,
      supportMessageCount: 1,
      unreadMessageCount: 1,
      messages: [message],
    });
    expect(thread.unreadMessageCount).toBe(1);
    expect(feedbackReplyRequestSchema.parse({ content: '  Thanks  ' }).content).toBe('Thanks');
    expect(realtimeEventSchema.parse({
      type: 'support.message_created',
      eventId: 'realtime-support-test',
      occurredAt: message.createdAt,
      feedbackId: thread.id,
    })).toMatchObject({ type: 'support.message_created', feedbackId: thread.id });
  });
});
