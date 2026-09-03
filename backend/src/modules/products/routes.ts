import { entityIdSchema } from '@uniclife/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { assertApp } from '../../common/http/errors.js';
import { requireDatabase } from '../../db/client.js';
import { productSkuImages, productSkus } from '../../db/schema.js';

export async function registerProductRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { productId: string }; Querystring: { v?: string } }>(
    '/:productId/image',
    { config: { rateLimit: { max: 180, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const productId = entityIdSchema.parse(request.params.productId);
      const requestedVersion = request.query.v === undefined ? undefined : Number(request.query.v);
      assertApp(
        requestedVersion === undefined || (Number.isInteger(requestedVersion) && requestedVersion > 0),
        400,
        'PRODUCT_IMAGE_VERSION_INVALID',
        '产品图片版本不合法',
      );
      const [image] = await requireDatabase()
        .select({ image: productSkuImages, imageVersion: productSkus.imageVersion })
        .from(productSkuImages)
        .innerJoin(productSkus, eq(productSkus.id, productSkuImages.skuId))
        .where(eq(productSkuImages.skuId, productId))
        .limit(1);
      assertApp(image, 404, 'PRODUCT_IMAGE_NOT_FOUND', '产品图片不存在');
      assertApp(
        requestedVersion === undefined || requestedVersion === image.imageVersion,
        404,
        'PRODUCT_IMAGE_VERSION_NOT_FOUND',
        '产品图片版本已更新',
      );

      const etag = `"${image.image.sha256}"`;
      if (request.headers['if-none-match'] === etag) {
        return reply.status(304).send();
      }
      return reply
        .header(
          'Cache-Control',
          requestedVersion === image.imageVersion
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=86400, must-revalidate',
        )
        .header('Content-Length', String(image.image.byteSize))
        .header('Content-Type', image.image.mimeType)
        .header('ETag', etag)
        .send(Buffer.from(image.image.data));
    },
  );
}
