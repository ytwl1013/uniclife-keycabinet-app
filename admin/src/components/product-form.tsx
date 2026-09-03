'use client';

import {
  adminProductCreateRequestSchema,
  adminProductUpdateRequestSchema,
  type AdminProduct,
  type AdminProductImageInput,
} from '@uniclife/shared';
import { Button, Card, Spinner } from '@heroui/react';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { preprocessProductImage } from '@/lib/product-image-preprocessor';

import { ProductQrPanel } from './product-qr-panel';

type ProductFormProps =
  | { mode: 'create'; product?: never }
  | { mode: 'edit'; product: AdminProduct };

type ApiBody = { message?: string; data?: AdminProduct };

const fieldClass =
  'mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100 disabled:text-zinc-500';
const labelClass = 'block text-xs font-medium text-zinc-700';

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const product = props.product;
  const [image, setImage] = useState<AdminProductImageInput | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageMessage, setImageMessage] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(product?.version ?? 0);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    setImageMessage('正在浏览器中缩放、转 WebP、压缩并清除元数据…');
    setError('');
    try {
      const prepared = await preprocessProductImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImage(prepared.input);
      setImagePreview(prepared.previewUrl);
      setImageMessage(
        `已在上传前处理：${prepared.input.width} × ${prepared.input.height}，${Math.ceil(prepared.input.byteSize / 1024)} KiB WebP`,
      );
    } catch (caught) {
      setImage(null);
      setImageMessage('');
      setError(caught instanceof Error ? caught.message : '图片预处理失败');
    } finally {
      setImageBusy(false);
      event.target.value = '';
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    const editable = {
      model: fields.get('model'),
      name: fields.get('name'),
      color: fields.get('color'),
      capacity: fields.get('capacity'),
      description: fields.get('description'),
      manualUrl: fields.get('manualUrl'),
    };
    const candidate = props.mode === 'create'
      ? { ...editable, sku: fields.get('sku'), image }
      : { ...editable, expectedVersion: version, ...(image ? { image } : {}) };
    const parsed = props.mode === 'create'
      ? adminProductCreateRequestSchema.safeParse(candidate)
      : adminProductUpdateRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(props.mode === 'create' && !image
        ? '创建产品时必须选择图片并等待预处理完成'
        : '请检查必填字段、网址和数值范围');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        props.mode === 'create'
          ? '/api/admin/products'
          : `/api/admin/products/${encodeURIComponent(product?.id ?? '')}`,
        {
          method: props.mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json()) as ApiBody;
      if (!response.ok || !body.data) {
        setError(body.message ?? '产品资料保存失败');
        return;
      }
      if (props.mode === 'create') {
        router.replace(`/products/${encodeURIComponent(body.data.id)}`);
        router.refresh();
        return;
      }
      setVersion(body.data.version);
      setImage(null);
      setImageMessage('');
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview('');
      setMessage(body.message ?? '产品资料已保存，二维码保持不变');
      router.refresh();
    } catch {
      setError('网络连接异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  const currentImage = imagePreview || (product?.image
    ? `/api/admin/products/${encodeURIComponent(product.id)}/image?v=${product.image.version}`
    : '');

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="admin-card">
        <Card.Content className="p-6">
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                SKU（创建后不可修改）
                <input
                  className={fieldClass}
                  defaultValue={product?.sku ?? ''}
                  disabled={props.mode === 'edit'}
                  maxLength={64}
                  name="sku"
                  pattern="[A-Za-z0-9-]+"
                  placeholder="例如 BG5163-BK"
                  required
                />
              </label>
              <label className={labelClass}>
                型号
                <input className={fieldClass} defaultValue={product?.model ?? ''} maxLength={128} name="model" required />
              </label>
              <label className={labelClass}>
                产品名称
                <input className={fieldClass} defaultValue={product?.name ?? ''} maxLength={128} name="name" required />
              </label>
              <label className={labelClass}>
                颜色
                <input className={fieldClass} defaultValue={product?.color ?? ''} maxLength={64} name="color" required />
              </label>
              <label className={labelClass}>
                槽位数量
                <input
                  className={fieldClass}
                  defaultValue={product?.capacity ?? 1}
                  max={1000}
                  min={1}
                  name="capacity"
                  readOnly={product ? !product.capacityEditable : false}
                  required
                  type="number"
                />
                {product && !product.capacityEditable ? (
                  <span className="mt-1.5 block text-[10px] leading-4 text-amber-700">已有柜体使用此 SKU，容量已锁定。</span>
                ) : null}
              </label>
              <label className={labelClass}>
                说明书地址
                <input className={fieldClass} defaultValue={product?.manualUrl ?? ''} maxLength={2048} name="manualUrl" placeholder="https://…" required type="url" />
              </label>
            </div>

            <label className={labelClass}>
              产品描述
              <textarea
                className="mt-2 min-h-32 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                defaultValue={product?.description ?? ''}
                maxLength={5000}
                name="description"
              />
            </label>

            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex gap-4 max-sm:flex-col">
                <div className="grid h-36 w-44 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  {currentImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="产品图片预览" className="size-full object-contain" src={currentImage} />
                  ) : (
                    <ImagePlus aria-hidden="true" className="text-zinc-300" size={32} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800">产品图片</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                    原图只在当前浏览器处理，不上传。上传前会缩放至最长边 1280px、转换为 WebP、压缩至 700 KiB 内并清除原图元数据。
                  </p>
                  <label className="mt-3 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    <ImagePlus aria-hidden="true" size={14} />
                    {product?.image ? '替换图片' : '选择图片'}
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageBusy || submitting} onChange={(event) => void selectImage(event)} type="file" />
                  </label>
                  {imageBusy ? <p className="mt-2 text-[11px] text-blue-600">正在本地处理，请稍候…</p> : null}
                  {imageMessage ? <p className="mt-2 text-[11px] text-emerald-700">{imageMessage}</p> : null}
                </div>
              </div>
            </section>

            {error ? <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700" role="alert">{error}</p> : null}
            {message ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700" role="status">{message}</p> : null}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-zinc-500 hover:bg-zinc-100" href="/products">
                <ArrowLeft aria-hidden="true" size={14} /> 返回产品列表
              </Link>
              <Button isDisabled={submitting || imageBusy} type="submit" variant="primary">
                {submitting ? <Spinner color="current" size="sm" /> : <Save aria-hidden="true" size={15} />}
                {submitting ? '正在保存…' : props.mode === 'create' ? '创建并生成二维码' : '保存资料'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      <div className="space-y-5">
        {product?.qr ? <ProductQrPanel code={product.qr.code} sku={product.sku} /> : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-xs leading-5 text-zinc-500">
            保存新产品后自动生成永久二维码。
          </section>
        )}
        {product ? (
          <Card className="admin-card">
            <Card.Content className="space-y-3 p-5 text-xs text-zinc-500">
              <div className="flex justify-between gap-4"><span>已初始化柜体</span><strong className="text-zinc-800">{product.cabinetCount}</strong></div>
              <div className="flex justify-between gap-4"><span>资料版本</span><strong className="text-zinc-800">v{version}</strong></div>
              <div className="flex justify-between gap-4"><span>图片存储</span><strong className="text-zinc-800">{product.image ? `${Math.ceil(product.image.byteSize / 1024)} KiB` : '内置占位图'}</strong></div>
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
