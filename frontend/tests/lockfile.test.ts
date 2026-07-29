import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('workspace lockfile', () => {
  it('locks the native mobile modules declared by the frontend', () => {
    const workspaceRoot = resolve(__dirname, '..', '..');
    const packageJson = JSON.parse(
      readFileSync(resolve(workspaceRoot, 'frontend/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const lockfile = readFileSync(resolve(workspaceRoot, 'pnpm-lock.yaml'), 'utf8');
    const expected = {
      '@gorhom/bottom-sheet': '5.2.9',
      '@react-native-community/datetimepicker': '8.4.4',
      'react-native-pager-view': '6.9.1',
      'react-native-qrcode-svg': '6.3.21',
      'react-native-svg': '15.12.1',
      'tailwind-merge': '3.4.0',
      'tailwind-variants': '3.2.2',
      uniwind: '1.10.0',
    } as const;

    Object.entries(expected).forEach(([dependency, version]) => {
      expect(packageJson.dependencies[dependency]).toBe(version);
      expect(lockfile).toContain(`specifier: ${version}`);
      expect(lockfile).toContain(`${dependency}@${version}`);
    });
  });
});
