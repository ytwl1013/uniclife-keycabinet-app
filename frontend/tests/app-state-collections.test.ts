import { uniqueById } from '../src/app-state/collections';

describe('app state collections', () => {
  it('keeps the first entity when merging duplicate IDs', () => {
    const updatedUser = { id: 'user-1', avatarUri: 'file:///new-avatar.jpg' };
    const staleUser = { id: 'user-1', avatarUri: 'file:///old-avatar.jpg' };

    expect(uniqueById([updatedUser, staleUser])).toEqual([updatedUser]);
  });
});
