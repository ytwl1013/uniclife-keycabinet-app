import {
  cabinetJoinQrPayloadSchema,
  productQrPayloadSchema,
} from '@uniclife/shared';

export type ScanMode = 'initialize' | 'join';

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
