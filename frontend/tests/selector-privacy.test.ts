import { createMockSelectors } from '../src/mocks/selectors';
import { createInitialMockState } from '../src/mocks/seed';

describe('selector privacy boundaries', () => {
  it('never includes loans from cabinets outside the signed-in account', () => {
    const state = createInitialMockState({
      currentUserId: 'user-owner',
      hydrated: true,
    });
    const foreignKey = state.keys.find((key) => key.cabinetId === 'cabinet-studio');
    expect(foreignKey).toBeDefined();
    if (foreignKey) foreignKey.status = 'borrowed';

    const borrowed = createMockSelectors(state).borrowedKeys();

    expect(borrowed.some((key) => key.cabinetId === 'cabinet-studio')).toBe(false);
    expect(borrowed.every((key) => key.cabinetId !== 'cabinet-studio')).toBe(true);
  });
});
