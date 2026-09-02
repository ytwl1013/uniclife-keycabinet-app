import { getFixedBottomSheetHeight } from '../src/styles/theme';

describe('fixed bottom sheet layout', () => {
  it('uses the fixed design height on regular screens', () => {
    expect(getFixedBottomSheetHeight(900)).toBe(560);
  });

  it('caps the sheet height on compact screens', () => {
    expect(getFixedBottomSheetHeight(600)).toBeCloseTo(492);
  });
});
