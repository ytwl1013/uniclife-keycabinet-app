export const mockErrorCodes = [
  'OFFLINE',
  'SESSION_REQUIRED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'PASSWORD_RESET_REQUIRED',
  'INVALID_INPUT',
  'EMAIL_ALREADY_REGISTERED',
  'USER_NOT_FOUND',
  'RESET_CHALLENGE_INVALID',
  'RESET_CODE_INVALID',
  'QR_NOT_FOUND',
  'QR_DISABLED',
  'CABINET_NOT_FOUND',
  'SKU_NOT_FOUND',
  'MEMBERSHIP_REQUIRED',
  'PERMISSION_DENIED',
  'OWNER_TRANSFER_REQUIRED',
  'MEMBER_NOT_FOUND',
  'CANNOT_REMOVE_OWNER',
  'SLOT_NOT_FOUND',
  'SLOT_OCCUPIED',
  'KEY_NOT_FOUND',
  'KEY_DELETED',
  'KEY_NOT_AVAILABLE',
  'KEY_NOT_BORROWED',
  'ACTIVE_LOAN_NOT_FOUND',
  'EXPECTED_RETURN_INVALID',
  'UNDO_NOT_ALLOWED',
  'ACTIVE_LOANS_BLOCK_CLEAR',
  'NO_KEYS_TO_CLEAR',
  'CLEAR_BATCH_NOT_FOUND',
  'CLEAR_BATCH_EXPIRED',
  'CLEAR_BATCH_ALREADY_RESTORED',
  'RESTORE_CONFLICT',
  'VERSION_CONFLICT',
  'REQUEST_ALREADY_PROCESSED',
  'EXPORT_FULL_CONTACT_FORBIDDEN',
  'EXPORT_NOT_SUPPORTED',
  'SHARING_NOT_AVAILABLE',
  'SEED_DATA_INVALID',
  'STORAGE_DATA_INVALID',
] as const;

export type MockErrorCode = (typeof mockErrorCodes)[number];

export class MockAppError extends Error {
  readonly code: MockErrorCode;
  readonly details?: Record<string, string | number | boolean | null>;

  constructor(
    code: MockErrorCode,
    details?: Record<string, string | number | boolean | null>,
  ) {
    super(code);
    this.name = 'MockAppError';
    this.code = code;
    this.details = details;
  }
}

export function isMockAppError(error: unknown): error is MockAppError {
  return error instanceof MockAppError;
}

export function assertMock(
  condition: unknown,
  code: MockErrorCode,
  details?: Record<string, string | number | boolean | null>,
): asserts condition {
  if (!condition) {
    throw new MockAppError(code, details);
  }
}
