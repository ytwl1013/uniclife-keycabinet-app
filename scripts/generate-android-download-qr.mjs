import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import QRCode from 'qrcode';

const outputDirectory = resolve('docs/android-release');
const pngPath = resolve(outputDirectory, 'uniclife-android-download-qr.png');
const svgPath = resolve(outputDirectory, 'uniclife-android-download-qr.svg');

function repositoryFromGit() {
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (match) return match[1];
  } catch {
    // Fall back to the repository configured for the release workflow.
  }
  return 'ytwl1013/uniclife-keycabinet-app';
}

const repository = process.env.GITHUB_REPOSITORY || repositoryFromGit();
const downloadUrl = process.env.ANDROID_DOWNLOAD_URL
  || `https://github.com/${repository}/releases/latest/download/uniclife-android.apk`;

mkdirSync(dirname(pngPath), { recursive: true });
await QRCode.toFile(pngPath, downloadUrl, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: { dark: '#000000', light: '#FFFFFF' },
});

const svg = await QRCode.toString(downloadUrl, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 1600,
  color: { dark: '#000000', light: '#FFFFFF' },
});
writeFileSync(svgPath, svg);

console.log(`Generated QR code for ${downloadUrl}`);
console.log(`PNG: ${pngPath}`);
console.log(`SVG: ${svgPath}`);
