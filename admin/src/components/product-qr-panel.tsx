'use client';

import { Button } from '@heroui/react';
import { Download, Printer } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

function downloadBlob(content: Blob, fileName: string): void {
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProductQrPanel({ code, sku }: { code: string; sku: string }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 720,
    })
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch(() => {
        if (active) setError('二维码生成失败');
      });
    return () => {
      active = false;
    };
  }, [code]);

  async function downloadPng() {
    const url = await QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 1800,
    });
    const response = await fetch(url);
    downloadBlob(await response.blob(), `${sku}-product-qr.png`);
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(code, {
      errorCorrectionLevel: 'M',
      margin: 4,
      type: 'svg',
    });
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${sku}-product-qr.svg`);
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <div className="flex gap-5 max-sm:flex-col">
        <div className="grid size-[220px] shrink-0 place-items-center rounded-2xl bg-white p-3 shadow-sm">
          {preview ? (
            <Image alt={`${sku} 产品初始化二维码`} height={196} priority src={preview} width={196} />
          ) : (
            <span className="text-xs text-zinc-400">{error || '正在生成二维码…'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">生产二维码</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            二维码与 SKU 创建后永久不变。修改产品图片、名称或描述不需要重新打印。
          </p>
          <code className="mt-4 block break-all rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-[10px] leading-5 text-blue-800">
            {code}
          </code>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button isDisabled={!preview} onPress={() => void downloadPng()} size="sm" variant="primary">
              <Download aria-hidden="true" size={14} /> 下载高清 PNG
            </Button>
            <Button isDisabled={!preview} onPress={() => void downloadSvg()} size="sm" variant="secondary">
              <Printer aria-hidden="true" size={14} /> 下载印刷 SVG
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
