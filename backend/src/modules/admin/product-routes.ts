import { createHash, randomBytes } from 'node:crypto';

import {
  adminProductCreateRequestSchema,
  adminProductQuerySchema,
  adminProductUpdateRequestSchema,
  entityIdSchema,
  productImageMaxBytes,
  type AdminProduct,
  type AdminProductImageInput,
} from '@uniclife/shared';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { toIsoDate } from '../../common/domain/dates.js';
import { toProductQr, toSku } from '../../common/domain/mappers.js';
import { assertApp, errorCode } from '../../common/http/errors.js';
import { ok } from '../../common/http/response.js';
import { createEntityId } from '../../common/security/ids.js';
import { requireDatabase, type AppDatabase } from '../../db/client.js';
import {
  cabinets,
  productQrs,
  productSkuImages,
  productSkus,
} from '../../db/schema.js';
import { appendAudit } from '../audit/service.js';

const productUploadBodyLimit = 1_100_000;

type ProductAdminRow = {
  product: typeof productSkus.$inferSelect;
  qr: typeof productQrs.$inferSelect | null;
  cabinetCount: number;
  imageMimeType: string | null;
  imageByteSize: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageSha256: string | null;
};

function productImagePath(productId: string, version: number): string {
  return `/api/v1/products/${encodeURIComponent(productId)}/image?v=${version}`;
}

function toAdminProduct(row: ProductAdminRow): AdminProduct {
  const product = toSku(row.product);
  const hasImage =
    row.product.imageVersion > 0 &&
    row.imageMimeType !== null &&
    row.imageByteSize !== null &&
    row.imageWidth !== null &&
    row.imageHeight !== null &&
    row.imageSha256 !== null;
  return {
    ...product,
    qr: row.qr ? toProductQr(row.qr) : null,
    image: hasImage
      ? {
          path: productImagePath(row.product.id, row.product.imageVersion),
          mimeType: 'image/webp',
          byteSize: row.imageByteSize!,
          width: row.imageWidth!,
          height: row.imageHeight!,
          sha256: row.imageSha256!,
          version: row.product.imageVersion,
        }
      : null,
    cabinetCount: row.cabinetCount,
    capacityEditable: row.cabinetCount === 0,
    version: row.product.version,
    createdAt: toIsoDate(row.product.createdAt),
    updatedAt: toIsoDate(row.product.updatedAt),
  };
}

function productCabinetCounts(database: AppDatabase) {
  return database
    .select({
      skuId: cabinets.skuId,
      cabinetCount: count().as('cabinet_count'),
    })
    .from(cabinets)
    .groupBy(cabinets.skuId)
    .as('product_cabinet_counts');
}

async function getProduct(database: AppDatabase, productId: string): Promise<ProductAdminRow | null> {
  const cabinetCounts = productCabinetCounts(database);
  const [row] = await database
    .select({
      product: productSkus,
      qr: productQrs,
      cabinetCount: sql<number>`coalesce(${cabinetCounts.cabinetCount}, 0)`.mapWith(Number),
      imageMimeType: productSkuImages.mimeType,
      imageByteSize: productSkuImages.byteSize,
      imageWidth: productSkuImages.width,
      imageHeight: productSkuImages.height,
      imageSha256: productSkuImages.sha256,
    })
    .from(productSkus)
    .leftJoin(productQrs, eq(productQrs.skuId, productSkus.id))
    .leftJoin(productSkuImages, eq(productSkuImages.skuId, productSkus.id))
    .leftJoin(cabinetCounts, eq(cabinetCounts.skuId, productSkus.id))
    .where(eq(productSkus.id, productId))
    .limit(1);
  return row ?? null;
}

function decodePreprocessedImage(input: AdminProductImageInput): Uint8Array {
  const data = Buffer.from(input.data, 'base64');
  assertApp(
    data.byteLength === input.byteSize && data.byteLength <= productImageMaxBytes,
    400,
    'PRODUCT_IMAGE_SIZE_INVALID',
    '图片数据大小与预处理结果不一致',
  );
  assertApp(
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
      data.subarray(8, 12).toString('ascii') === 'WEBP',
    400,
    'PRODUCT_IMAGE_FORMAT_INVALID',
    '图片必须在上传前转换为 WebP',
  );
  assertApp(
    createHash('sha256').update(data).digest('hex') === input.sha256,
    400,
    'PRODUCT_IMAGE_HASH_INVALID',
    '图片摘要校验失败',
  );
  return data;
}

function productQrCode(sku: string): string {
  return `uniclife://cabinet/v1/init/${sku}/${randomBytes(24).toString('base64url')}`;
}

async function storeFailureAudit(
  database: AppDatabase,
  request: { log: { error: (value: unknown, message: string) => void } },
  input: { action: string; targetId: string; error: unknown },
): Promise<void> {
  try {
    await appendAudit(database, {
      action: input.action,
      targetType: 'product_sku',
      targetId: input.targetId,
      result: 'failure',
      reasonCode: errorCode(input.error),
      metadata: { adminActor: 'environment_admin' },
    });
  } catch (auditError) {
    request.log.error({ err: auditError }, 'admin product failure audit storage failed');
  }
}

export async function registerAdminProductRoutes(app: FastifyInstance): Promise<void> {
  app.get('/products', async (request) => {
    const query = adminProductQuerySchema.parse(request.query);
    const database = requireDatabase();
    const pattern = `%${query.query}%`;
    const where = query.query
      ? or(
          ilike(productSkus.sku, pattern),
          ilike(productSkus.model, pattern),
          ilike(productSkus.name, pattern),
          ilike(productSkus.description, pattern),
        )
      : undefined;
    const cabinetCounts = productCabinetCounts(database);
    const [totalRow] = await database.select({ value: count() }).from(productSkus).where(where);
    const rows = await database
      .select({
        product: productSkus,
        qr: productQrs,
        cabinetCount: sql<number>`coalesce(${cabinetCounts.cabinetCount}, 0)`.mapWith(Number),
        imageMimeType: productSkuImages.mimeType,
        imageByteSize: productSkuImages.byteSize,
        imageWidth: productSkuImages.width,
        imageHeight: productSkuImages.height,
        imageSha256: productSkuImages.sha256,
      })
      .from(productSkus)
      .leftJoin(productQrs, eq(productQrs.skuId, productSkus.id))
      .leftJoin(productSkuImages, eq(productSkuImages.skuId, productSkus.id))
      .leftJoin(cabinetCounts, eq(cabinetCounts.skuId, productSkus.id))
      .where(where)
      .orderBy(desc(productSkus.updatedAt), desc(productSkus.id))
      .limit(query.limit)
      .offset(query.offset);

    return ok({
      items: rows.map(toAdminProduct),
      total: totalRow?.value ?? 0,
      limit: query.limit,
      offset: query.offset,
    });
  });

  app.get<{ Params: { productId: string } }>('/products/:productId', async (request) => {
    const productId = entityIdSchema.parse(request.params.productId);
    const product = await getProduct(requireDatabase(), productId);
    assertApp(product, 404, 'PRODUCT_NOT_FOUND', '产品型号不存在');
    return ok(toAdminProduct(product));
  });

  app.post(
    '/products',
    {
      bodyLimit: productUploadBodyLimit,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const input = adminProductCreateRequestSchema.parse(request.body);
      const database = requireDatabase();
      const productId = createEntityId('sku');
      const qrCode = productQrCode(input.sku);
      try {
        const imageData = decodePreprocessedImage(input.image);
        await database.transaction(async (transaction) => {
          await transaction.insert(productSkus).values({
            id: productId,
            sku: input.sku,
            model: input.model,
            name: input.name,
            color: input.color,
            capacity: input.capacity,
            description: input.description,
            manualUrl: input.manualUrl,
            imageAsset: 'database',
            imageVersion: 1,
          });
          await transaction.insert(productSkuImages).values({
            skuId: productId,
            data: imageData,
            mimeType: input.image.mimeType,
            byteSize: input.image.byteSize,
            width: input.image.width,
            height: input.image.height,
            sha256: input.image.sha256,
          });
          await transaction.insert(productQrs).values({
            id: createEntityId('product-qr'),
            code: qrCode,
            skuId: productId,
          });
          await appendAudit(transaction, {
            action: 'admin.product_created',
            targetType: 'product_sku',
            targetId: productId,
            result: 'success',
            metadata: {
              adminActor: 'environment_admin',
              sku: input.sku,
              capacity: input.capacity,
              imageByteSize: input.image.byteSize,
            },
          });
        });
      } catch (error) {
        await storeFailureAudit(database, request, {
          action: 'admin.product_created',
          targetId: input.sku,
          error,
        });
        throw error;
      }
      const product = await getProduct(database, productId);
      assertApp(product, 500, 'PRODUCT_CREATE_FAILED', '产品型号创建后无法读取');
      return reply.status(201).send(ok(toAdminProduct(product), '产品型号已创建'));
    },
  );

  app.patch<{ Params: { productId: string } }>(
    '/products/:productId',
    {
      bodyLimit: productUploadBodyLimit,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => {
      const productId = entityIdSchema.parse(request.params.productId);
      const input = adminProductUpdateRequestSchema.parse(request.body);
      const database = requireDatabase();
      const now = new Date().toISOString();
      try {
        const imageData = input.image ? decodePreprocessedImage(input.image) : undefined;
        await database.transaction(async (transaction) => {
          const [current] = await transaction
            .select()
            .from(productSkus)
            .where(eq(productSkus.id, productId))
            .limit(1)
            .for('update');
          assertApp(current, 404, 'PRODUCT_NOT_FOUND', '产品型号不存在');
          assertApp(
            current.version === input.expectedVersion,
            409,
            'PRODUCT_VERSION_CONFLICT',
            '产品资料已被其他操作更新，请刷新后重试',
          );
          const [usage] = await transaction
            .select({ value: count() })
            .from(cabinets)
            .where(eq(cabinets.skuId, productId));
          assertApp(
            (usage?.value ?? 0) === 0 || input.capacity === current.capacity,
            409,
            'PRODUCT_CAPACITY_LOCKED',
            '该 SKU 已经创建过柜体，槽位数量不能再修改',
          );
          const [updated] = await transaction
            .update(productSkus)
            .set({
              model: input.model,
              name: input.name,
              color: input.color,
              capacity: input.capacity,
              description: input.description,
              manualUrl: input.manualUrl,
              imageVersion: current.imageVersion + (input.image ? 1 : 0),
              version: current.version + 1,
              updatedAt: now,
            })
            .where(
              and(
                eq(productSkus.id, productId),
                eq(productSkus.version, input.expectedVersion),
              ),
            )
            .returning();
          assertApp(updated, 409, 'PRODUCT_VERSION_CONFLICT', '产品资料已被其他操作更新，请刷新后重试');
          if (input.image && imageData) {
            await transaction
              .insert(productSkuImages)
              .values({
                skuId: productId,
                data: imageData,
                mimeType: input.image.mimeType,
                byteSize: input.image.byteSize,
                width: input.image.width,
                height: input.image.height,
                sha256: input.image.sha256,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: productSkuImages.skuId,
                set: {
                  data: imageData,
                  mimeType: input.image.mimeType,
                  byteSize: input.image.byteSize,
                  width: input.image.width,
                  height: input.image.height,
                  sha256: input.image.sha256,
                  updatedAt: now,
                },
              });
          }
          await appendAudit(transaction, {
            action: 'admin.product_updated',
            targetType: 'product_sku',
            targetId: productId,
            result: 'success',
            metadata: {
              adminActor: 'environment_admin',
              sku: current.sku,
              imageUpdated: Boolean(input.image),
              previousVersion: current.version,
              nextVersion: current.version + 1,
            },
          });
        });
      } catch (error) {
        await storeFailureAudit(database, request, {
          action: 'admin.product_updated',
          targetId: productId,
          error,
        });
        throw error;
      }
      const product = await getProduct(database, productId);
      assertApp(product, 500, 'PRODUCT_UPDATE_FAILED', '产品资料更新后无法读取');
      return ok(toAdminProduct(product), '产品资料已更新，二维码保持不变');
    },
  );
}
