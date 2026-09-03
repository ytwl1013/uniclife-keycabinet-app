import {
  productImageMaxBytes,
  productImageMaxDimension,
  type AdminProductImageInput,
} from '@uniclife/shared';

const maxSourceBytes = 12 * 1024 * 1024;
const qualities = [0.82, 0.74, 0.66, 0.58] as const;

export type PreparedProductImage = {
  input: AdminProductImageInput;
  previewUrl: string;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error('无法解码所选图片');
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== 'image/webp') {
          reject(new Error('当前浏览器无法生成 WebP 图片，请使用最新版 Chrome、Edge 或 Safari'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function preprocessProductImage(file: File): Promise<PreparedProductImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请选择 JPEG、PNG 或 WebP 图片');
  }
  if (file.size <= 0 || file.size > maxSourceBytes) {
    throw new Error('原始图片必须小于 12 MB');
  }

  const loaded = await loadImage(file);
  try {
    if (!loaded.width || !loaded.height) throw new Error('无法读取图片尺寸');
    const initialScale = Math.min(1, productImageMaxDimension / Math.max(loaded.width, loaded.height));
    let width = Math.max(1, Math.round(loaded.width * initialScale));
    let height = Math.max(1, Math.round(loaded.height * initialScale));
    const canvas = document.createElement('canvas');
    let blob: Blob | undefined;

    for (const quality of qualities) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('浏览器无法处理该图片');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(loaded.source, 0, 0, width, height);
      blob = await canvasBlob(canvas, quality);
      if (blob.size <= productImageMaxBytes) break;
      const shrink = Math.min(0.9, Math.sqrt(productImageMaxBytes / blob.size) * 0.92);
      width = Math.max(1, Math.round(width * shrink));
      height = Math.max(1, Math.round(height * shrink));
    }

    if (!blob || blob.size > productImageMaxBytes) {
      throw new Error('图片压缩后仍超过 700 KiB，请选择更简单或更小的图片');
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return {
      input: {
        data: bytesToBase64(bytes),
        mimeType: 'image/webp',
        byteSize: bytes.byteLength,
        width,
        height,
        sha256: bytesToHex(digest),
      },
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    loaded.dispose();
  }
}
