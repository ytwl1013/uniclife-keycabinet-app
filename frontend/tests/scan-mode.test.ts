import {
  getScanModeMismatch,
  selectDetectedQrCode,
} from '../src/features/scan/scan-mode';

const productQr =
  'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026';
const joinQr =
  'uniclife://cabinet/v1/join/1234567890abcdefghijklmnopqrstuvwxyzAB';

describe('scan mode QR restrictions', () => {
  it('rejects a product QR from the join-existing flow', () => {
    expect(getScanModeMismatch('join', productQr)).toBe('productQrInJoinMode');
  });

  it('rejects an invitation QR from the initialize-new flow', () => {
    expect(getScanModeMismatch('initialize', joinQr)).toBe('joinQrInInitializeMode');
  });

  it('accepts only the matching QR type for each flow', () => {
    expect(getScanModeMismatch('initialize', productQr)).toBeNull();
    expect(getScanModeMismatch('join', joinQr)).toBeNull();
  });

  it('accepts both QR types from the shared Add cabinet flow', () => {
    expect(getScanModeMismatch('auto', productQr)).toBeNull();
    expect(getScanModeMismatch('auto', joinQr)).toBeNull();
  });

  it('leaves unknown codes to the normal invalid-code handling', () => {
    expect(getScanModeMismatch('initialize', 'https://example.com')).toBeNull();
    expect(getScanModeMismatch('join', 'https://example.com')).toBeNull();
  });

  it('prefers a supported cabinet QR when an image contains multiple codes', () => {
    expect(selectDetectedQrCode(['https://example.com', joinQr])).toBe(joinQr);
    expect(selectDetectedQrCode(['  ', productQr])).toBe(productQr);
    expect(selectDetectedQrCode([])).toBeNull();
  });
});
