import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('workspace lockfile', () => {
  it('locks the native date-time picker declared by the frontend', () => {
    const workspaceRoot = resolve(__dirname, '..', '..');
    const packageJson = JSON.parse(
      readFileSync(resolve(workspaceRoot, 'frontend/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const lockfile = readFileSync(resolve(workspaceRoot, 'pnpm-lock.yaml'), 'utf8');
    const version = packageJson.dependencies['@react-native-community/datetimepicker'];

    expect(version).toBe('8.4.4');
    expect(lockfile).toContain(
      `'@react-native-community/datetimepicker':\n        specifier: ${version}`,
    );
    expect(lockfile).toContain(`'@react-native-community/datetimepicker@${version}':`);
  });
});
