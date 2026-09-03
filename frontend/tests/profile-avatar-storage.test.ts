const mockExistingFiles = new Set<string>();
const mockCreatedDirectories = new Set<string>();
const mockManipulateAsync = jest.fn();

function mockJoinPath(parts: unknown[]): string {
  return parts
    .map((part) => typeof part === 'string' ? part : (part as { uri: string }).uri)
    .map((part, index) => index === 0 ? part.replace(/\/$/, '') : part.replace(/^\//, ''))
    .join('/');
}

jest.mock('expo-file-system', () => {
  class MockDirectory {
    readonly uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPath(parts);
    }

    create() {
      mockCreatedDirectories.add(this.uri);
    }
  }

  class MockFile {
    uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPath(parts);
    }

    get exists() {
      return mockExistingFiles.has(this.uri);
    }

    copy(destination: MockFile) {
      mockExistingFiles.add(destination.uri);
    }

    delete() {
      mockExistingFiles.delete(this.uri);
    }

    move(destination: MockFile) {
      mockExistingFiles.delete(this.uri);
      mockExistingFiles.add(destination.uri);
      this.uri = destination.uri;
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: new MockDirectory('file:///documents') },
  };
});

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg' },
}));

import {
  loadLocalProfileAvatar,
  removeLocalProfileAvatar,
  saveLocalProfileAvatar,
} from '../src/api/profile-avatar-storage';

const persistedAvatarUri = 'file:///documents/profile-avatars/user-123.jpg';

describe('local profile avatar storage', () => {
  beforeEach(() => {
    mockExistingFiles.clear();
    mockCreatedDirectories.clear();
    mockManipulateAsync.mockReset();
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///cache/processed-avatar.jpg' });
  });

  it('compresses a selected image into the app document directory', async () => {
    await expect(
      saveLocalProfileAvatar('user-123', 'file:///picker-cache/avatar.png'),
    ).resolves.toBe(persistedAvatarUri);

    expect(mockCreatedDirectories).toContain('file:///documents/profile-avatars');
    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///picker-cache/avatar.png',
      [{ resize: { width: 512 } }],
      { compress: 0.82, format: 'jpeg' },
    );
    expect(mockExistingFiles).toContain(persistedAvatarUri);
  });

  it('loads and removes the avatar belonging to one user', async () => {
    mockExistingFiles.add(persistedAvatarUri);

    await expect(loadLocalProfileAvatar('user-123')).resolves.toBe(persistedAvatarUri);
    await expect(removeLocalProfileAvatar('user-123')).resolves.toBeUndefined();
    await expect(loadLocalProfileAvatar('user-123')).resolves.toBeUndefined();
  });
});
