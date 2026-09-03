import {
  cabinetJoinQrPayloadSchema,
  cabinetQrPayloadSchema,
  productQrPayloadSchema,
} from '@uniclife/shared';

export type ScanMode = 'auto' | 'initialize' | 'join';

export type ScanModeMismatch =
  | 'productQrInJoinMode'
  | 'joinQrInInitializeMode';

export function getScanModeMismatch(
  mode: ScanMode,
  code: string,
): ScanModeMismatch | null {
  if (mode === 'join' && productQrPayloadSchema.safeParse(code).success) {
    return 'productQrInJoinMode';
  }

  if (mode === 'initialize' && cabinetJoinQrPayloadSchema.safeParse(code).success) {
    return 'joinQrInInitializeMode';
  }

  return null;
}

export function selectDetectedQrCode(codes: readonly string[]): string | null {
  const nonEmptyCodes = codes.map((code) => code.trim()).filter(Boolean);

  return (
    nonEmptyCodes.find((code) => cabinetQrPayloadSchema.safeParse(code).success) ??
    nonEmptyCodes[0] ??
    null
  );
}
