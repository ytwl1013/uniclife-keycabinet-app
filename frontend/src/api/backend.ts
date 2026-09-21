import type {
  Cabinet,
  CabinetDetail,
  CabinetEvent,
  CabinetJoinInvitation,
  CabinetMembership,
  CabinetQrResolution,
  CabinetSummary,
  CheckoutKeyRequest,
  CurrentUserAccount,
  FeedbackRequest,
  FeedbackThread,
  FeedbackThreadSummary,
  InitializeCabinetRequest,
  JoinCabinetRequest,
  Key,
  Loan,
  PushTokenRequest,
  RegisterRequest,
  ReturnKeyRequest,
  SignInRequest,
  UpdateKeyRequest,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

import { callApi } from './client';

type Session = { token: string; expiresAt: string | null };
type AuthResult = { user: CurrentUserAccount; session: Session };

const persistentSession = process.env.EXPO_OS !== 'web';

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export const backendApi = {
  register: (input: RegisterRequest) =>
    callApi<AuthResult>('/auth/register', json('POST', { ...input, persistentSession })),
  signIn: (input: SignInRequest) =>
    callApi<AuthResult>('/auth/sign-in', json('POST', { ...input, persistentSession })),
  signOut: (token: string) =>
    callApi<{ signedOut: boolean }>('/auth/sign-out', { ...json('POST'), token }),
  session: (token: string, timeoutMs?: number) =>
    callApi<{ user: CurrentUserAccount }>('/auth/session', { token, timeoutMs }),
  requestPasswordReset: (email: string) =>
    callApi<{
      challengeId: string;
      expiresInSeconds: number;
      previewCode?: string;
    }>('/auth/password-resets', json('POST', { email })),
  verifyPasswordReset: (challengeId: string, code: string) =>
    callApi<{ resetToken: string; expiresAt: string }>(
      '/auth/password-resets/verify',
      json('POST', { challengeId, code }),
    ),
  completePasswordReset: (resetToken: string, newPassword: string) =>
    callApi<{ reset: boolean }>(
      '/auth/password-resets/complete',
      json('POST', { resetToken, newPassword }),
    ),
  updateProfile: (
    token: string,
    input: { displayName: string; avatarUri?: string | null } & WriteOptions,
  ) => callApi<CurrentUserAccount>('/users/me/profile', { ...json('PATCH', input), token }),
  updateEmail: (token: string, input: { email: string } & WriteOptions) =>
    callApi<CurrentUserAccount>('/users/me/email', { ...json('PATCH', input), token }),
  markHomeGuidePrompted: (token: string, input: WriteOptions = {}) =>
    callApi<CurrentUserAccount>(
      '/users/me/home-guide',
      { ...json('PATCH', { ...input, prompted: true }), token },
    ),
  changePassword: (
    token: string,
    input: { currentPassword: string; newPassword: string } & WriteOptions,
  ) => callApi<{ changed: boolean }>('/users/me/password', { ...json('PATCH', input), token }),
  deleteAccount: (token: string, input: WriteOptions = {}) =>
    callApi<{ deleted: boolean }>('/users/me', { ...json('DELETE', input), token }),
  registerPushToken: (token: string, input: PushTokenRequest) =>
    callApi<{ registered: boolean }>(
      '/users/me/push-tokens',
      { ...json('POST', input), token },
    ),
  unregisterPushToken: (token: string, input: PushTokenRequest) =>
    callApi<{ removed: boolean }>(
      '/users/me/push-tokens',
      { ...json('DELETE', input), token },
    ),
  submitFeedback: (token: string, input: FeedbackRequest) =>
    callApi<{ submissionId: string; submittedAt: string; thread: FeedbackThread }>(
      '/support/feedback',
      { ...json('POST', input), token },
    ),
  listFeedbackHistory: (token: string) =>
    callApi<{ items: FeedbackThreadSummary[] }>('/support/feedback?limit=100', { token }),
  getFeedbackThread: (token: string, feedbackId: string) =>
    callApi<FeedbackThread>(`/support/feedback/${encodeURIComponent(feedbackId)}`, { token }),
  replyToFeedback: (token: string, feedbackId: string, content: string) =>
    callApi<{ thread: FeedbackThread }>(
      `/support/feedback/${encodeURIComponent(feedbackId)}/messages`,
      { ...json('POST', { content }), token },
    ),
  markFeedbackThreadRead: (token: string, feedbackId: string) =>
    callApi<{ markedReadCount: number }>(
      `/support/feedback/${encodeURIComponent(feedbackId)}/read`,
      { ...json('POST'), token },
    ),
  listCabinets: (token: string) => callApi<CabinetSummary[]>('/cabinets', { token }),
  getCabinet: (token: string, cabinetId: string) =>
    callApi<CabinetDetail>(`/cabinets/${encodeURIComponent(cabinetId)}`, { token }),
  resolveCabinetQr: (token: string, code: string) =>
    callApi<CabinetQrResolution>(
      '/cabinets/resolve-qr',
      { ...json('POST', { code }), token },
    ),
  initializeCabinet: (token: string, input: InitializeCabinetRequest) =>
    callApi<{ cabinet: Cabinet; membership: CabinetMembership }>(
      '/cabinets/initialize',
      { ...json('POST', input), token },
    ),
  createCabinetJoinInvitation: (token: string, cabinetId: string) =>
    callApi<{ invitation: CabinetJoinInvitation }>(
      `/cabinets/${encodeURIComponent(cabinetId)}/join-invitations`,
      { ...json('POST', {}), token },
    ),
  revokeCabinetJoinInvitation: (
    token: string,
    cabinetId: string,
    invitationId: string,
  ) => callApi<{ revoked: boolean }>(
    `/cabinets/${encodeURIComponent(cabinetId)}/join-invitations/${encodeURIComponent(invitationId)}`,
    { ...json('DELETE', {}), token },
  ),
  joinCabinet: (token: string, input: JoinCabinetRequest) =>
    callApi<{ cabinet: Cabinet; membership: CabinetMembership }>(
      '/cabinets/join',
      { ...json('POST', input), token },
    ),
  renameCabinet: (token: string, cabinetId: string, input: { name: string } & WriteOptions) =>
    callApi<Cabinet>(
      `/cabinets/${encodeURIComponent(cabinetId)}`,
      { ...json('PATCH', input), token },
    ),
  disconnectCabinet: (token: string, cabinetId: string, input: WriteOptions) =>
    callApi<{ removed: boolean; cabinetVersion: number }>(
      `/cabinets/${encodeURIComponent(cabinetId)}/membership`,
      { ...json('DELETE', input), token },
    ),
  deleteCabinet: (token: string, cabinetId: string, input: WriteOptions) =>
    callApi<{ deleted: boolean; disconnectedMemberCount: number }>(
      `/cabinets/${encodeURIComponent(cabinetId)}`,
      { ...json('DELETE', input), token },
    ),
  transferCabinetSuperAdmin: (
    token: string,
    cabinetId: string,
    input: { membershipId: string } & WriteOptions,
  ) => callApi<{
    previousSuperAdmin: CabinetMembership;
    nextSuperAdmin: CabinetMembership;
    cabinetVersion: number;
  }>(
    `/cabinets/${encodeURIComponent(cabinetId)}/super-admin-transfer`,
    { ...json('POST', input), token },
  ),
  removeMember: (token: string, cabinetId: string, membershipId: string, input: WriteOptions) =>
    callApi<{ removed: boolean }>(
      `/cabinets/${encodeURIComponent(cabinetId)}/members/${encodeURIComponent(membershipId)}`,
      { ...json('DELETE', input), token },
    ),
  deleteCabinetKeys: (token: string, cabinetId: string, input: WriteOptions) =>
    callApi<{ deletedCount: number }>(
      `/cabinets/${encodeURIComponent(cabinetId)}/keys`,
      { ...json('DELETE', input), token },
    ),
  addKey: (
    token: string,
    cabinetId: string,
    input: { slotId: string; name: string; note?: string } & WriteOptions,
  ) => callApi<{ key: Key; cabinetVersion: number }>(
    `/cabinets/${encodeURIComponent(cabinetId)}/keys`,
    { ...json('POST', input), token },
  ),
  updateKey: (token: string, keyId: string, input: UpdateKeyRequest) =>
    callApi<{ key: Key; cabinetVersion: number }>(
      `/keys/${encodeURIComponent(keyId)}`,
      { ...json('PATCH', input), token },
    ),
  deleteKey: (token: string, keyId: string, input: WriteOptions) =>
    callApi<{ deleted: boolean; cabinetVersion: number }>(
      `/keys/${encodeURIComponent(keyId)}`,
      { ...json('DELETE', input), token },
    ),
  checkoutKey: (token: string, keyId: string, input: CheckoutKeyRequest) =>
    callApi<{ key: Key; event: CabinetEvent; cabinetVersion: number }>(
      `/keys/${encodeURIComponent(keyId)}/checkout`,
      { ...json('POST', input), token },
    ),
  returnKey: (token: string, keyId: string, input: ReturnKeyRequest) =>
    callApi<{ key: Key; event: CabinetEvent; cabinetVersion: number }>(
      `/keys/${encodeURIComponent(keyId)}/return`,
      { ...json('POST', input), token },
    ),
  listLoans: (token: string) =>
    callApi<{ items: Loan[] }>('/records/loans?limit=200', { token }),
  listEvents: (token: string) =>
    callApi<{ items: CabinetEvent[]; actors: UserAccount[] }>(
      '/records/events?limit=200',
      { token },
    ),
};
