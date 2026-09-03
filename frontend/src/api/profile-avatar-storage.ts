import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const avatarDirectoryName = 'profile-avatars';
const avatarFileExtension = '.jpg';
const avatarMaxWidth = 512;

function avatarDirectory(): Directory {
  return new Directory(Paths.document, avatarDirectoryName);
}

function avatarFile(userId: string): File {
  return new File(avatarDirectory(), `${encodeURIComponent(userId)}${avatarFileExtension}`);
}

function pendingAvatarFile(userId: string): File {
  return new File(avatarDirectory(), `${encodeURIComponent(userId)}.pending${avatarFileExtension}`);
}

export async function loadLocalProfileAvatar(userId: string): Promise<string | undefined> {
  if (process.env.EXPO_OS === 'web') return undefined;

  try {
    const file = avatarFile(userId);
    return file.exists ? file.uri : undefined;
  } catch {
    return undefined;
  }
}

export async function saveLocalProfileAvatar(userId: string, sourceUri: string): Promise<string> {
  if (process.env.EXPO_OS === 'web') return sourceUri;

  const directory = avatarDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const destination = avatarFile(userId);

  if (sourceUri === destination.uri && destination.exists) return destination.uri;

  const processed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: avatarMaxWidth } }],
    { compress: 0.82, format: SaveFormat.JPEG },
  );
  const temporaryFile = new File(processed.uri);
  const pendingFile = pendingAvatarFile(userId);

  if (pendingFile.exists) pendingFile.delete();
  temporaryFile.copy(pendingFile);
  if (destination.exists) destination.delete();
  pendingFile.move(destination);
  return destination.uri;
}

export async function removeLocalProfileAvatar(userId: string): Promise<void> {
  if (process.env.EXPO_OS === 'web') return;

  const file = avatarFile(userId);
  if (file.exists) file.delete();
}
