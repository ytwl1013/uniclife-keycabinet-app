import { MockAppError } from './errors';
import { ExportArtifact } from './types';

export async function saveExportArtifact(artifact: ExportArtifact): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  const file = new File(Paths.cache, artifact.filename);
  file.create({ overwrite: true, intermediates: true });
  file.write(artifact.bytes);
  if (!(await Sharing.isAvailableAsync())) {
    throw new MockAppError('SHARING_NOT_AVAILABLE');
  }
  await Sharing.shareAsync(file.uri, { mimeType: artifact.mimeType });
  return file.uri;
}
