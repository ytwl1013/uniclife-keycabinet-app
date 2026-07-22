import { MockAppError } from './errors';
import { ExportArtifact } from './types';

export async function saveExportArtifact(artifact: ExportArtifact): Promise<string> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new MockAppError('EXPORT_NOT_SUPPORTED');
  }
  const buffer = artifact.bytes.slice().buffer as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: artifact.mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return artifact.filename;
}
