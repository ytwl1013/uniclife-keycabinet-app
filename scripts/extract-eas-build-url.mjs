import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/extract-eas-build-url.mjs <eas-build-json>');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, 'utf8'));

function findBuildUrl(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.buildUrl === 'string' && value.buildUrl.startsWith('https://')) {
    return value.buildUrl;
  }
  for (const child of Object.values(value)) {
    const result = findBuildUrl(child);
    if (result) return result;
  }
  return null;
}

const buildUrl = findBuildUrl(payload);
if (!buildUrl) {
  console.error(`No successful EAS build URL found in ${file}`);
  process.exit(1);
}

process.stdout.write(`${buildUrl}\n`);
