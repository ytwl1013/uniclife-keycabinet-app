import type {
  BindCabinetRequest,
  Cabinet,
  CabinetDetail,
  CabinetEvent,
  CabinetMembership,
  CabinetQr,
  CabinetSummary,
  CheckoutKeyRequest,
  Key,
  Loan,
  ProductSku,
  RegisterRequest,
  ReturnKeyRequest,
  SignInRequest,
  UpdateKeyRequest,
  UserAccount,
  WriteOptions,
} from '@uniclife/shared';

import { callApi } from './client';

type Session = { token: string; expiresAt: string };
type AuthResult = { user: UserAccount; session: Session };

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export const backendApi = {
  register: (input: RegisterRequest) =>
    callApi<AuthResult>('/auth/register', json('POST', input)),
  signIn: (input: SignInRequest) =>
    callApi<AuthResult>('/auth/sign-in', json('POST', input)),
  signOut: (token: string) =>
    callApi<{ signedOut: boolean }>('/auth/sign-out', { ...json('POST'), token }),
  session: (token: string) =>
    callApi<{ user: UserAccount }>('/auth/session', { token }),
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
  ) => callApi<UserAccount>('/users/me/profile', { ...json('PATCH', input), token }),
  updateEmail: (token: string, input: { email: string } & WriteOptions) =>
    callApi<UserAccount>('/users/me/email', { ...json('PATCH', input), token }),
  changePassword: (
    token: string,
    input: { currentPassword: string; newPassword: string } & WriteOptions,
  ) => callApi<{ changed: boolean }>('/users/me/password', { ...json('PATCH', input), token }),
  deleteAccount: (token: string, input: WriteOptions = {}) =>
    callApi<{ deleted: boolean }>('/users/me', { ...json('DELETE', input), token }),
  listCabinets: (token: string) => callApi<CabinetSummary[]>('/cabinets', { token }),
  getCabinet: (token: string, cabinetId: string) =>
    callApi<CabinetDetail>(`/cabinets/${encodeURIComponent(cabinetId)}`, { token }),
  resolveCabinetQr: (token: string, code: string) =>
    callApi<{ qr: CabinetQr; sku: ProductSku; cabinet?: Cabinet }>(
      '/cabinets/resolve-qr',
      { ...json('POST', { code }), token },
    ),
  bindCabinet: (token: string, input: BindCabinetRequest) =>
    callApi<{ cabinet: Cabinet; membership: CabinetMembership }>(
      '/cabinets/bind',
      { ...json('POST', input), token },
    ),
  renameCabinet: (token: string, cabinetId: string, input: { name: string } & WriteOptions) =>
    callApi<Cabinet>(
      `/cabinets/${encodeURIComponent(cabinetId)}`,
      { ...json('PATCH', input), token },
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
