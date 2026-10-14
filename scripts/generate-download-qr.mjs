import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import QRCode from 'qrcode';

const outputDirectory = resolve('docs/download-qr');
const pngPath = resolve(outputDirectory, 'uniclife-download-qr.png');
const svgPath = resolve(outputDirectory, 'uniclife-download-qr.svg');

// The QR code points at the download landing page, not at a file. The page
// decides what to offer (App Store / APK), so this code never needs reprinting.
const downloadUrl = process.env.DOWNLOAD_PAGE_URL
  || 'https://ytwl1013.github.io/uniclife-keycabinet-app/';

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
