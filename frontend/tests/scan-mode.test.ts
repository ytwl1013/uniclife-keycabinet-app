import { getScanModeMismatch } from '../src/features/scan/scan-mode';

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

  it('leaves unknown codes to the normal invalid-code handling', () => {
    expect(getScanModeMismatch('initialize', 'https://example.com')).toBeNull();
    expect(getScanModeMismatch('join', 'https://example.com')).toBeNull();
  });
});
