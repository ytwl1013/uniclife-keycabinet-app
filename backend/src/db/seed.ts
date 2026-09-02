import { env } from '../common/config/env.js';
import { closeDatabase, requireDatabase } from './client.js';
import { productQrs, productSkus } from './schema.js';

if (env.NODE_ENV === 'production') {
  throw new Error('Development seed cannot run in production');
}

const database = requireDatabase();

await database
  .insert(productSkus)
  .values([
    {
      id: 'sku-bg5163-bk',
      sku: 'BG5163-BK',
      model: 'BG5163-BK',
      name: 'Uniclife 32 Position Key Cabinet',
      color: 'Black',
      capacity: 32,
      description: 'Uniclife wall-mounted key cabinet with 32 numbered positions.',
      manualUrl: 'https://example.com/manuals/bg5163-bk',
      imageAsset: 'cabinet-bg5163-bk',
    },
    {
      id: 'sku-bg0680-bk',
      sku: 'BG0680-BK',
      model: 'BG0680-BK',
      name: 'Uniclife 60 Position Key Cabinet',
      color: 'Black',
      capacity: 60,
      description: 'Uniclife wall-mounted key cabinet with 60 numbered positions.',
      manualUrl: 'https://example.com/manuals/bg0680-bk',
      imageAsset: 'cabinet-bg0680-bk',
    },
  ])
  .onConflictDoNothing();

await database
  .insert(productQrs)
  .values([
    {
      id: 'product-qr-bg5163-bk',
      code: 'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
      skuId: 'sku-bg5163-bk',
      status: 'active',
    },
    {
      id: 'product-qr-bg0680-bk',
      code: 'uniclife://cabinet/v1/init/BG0680-BK/uniclife-bg0680-bk-2026',
      skuId: 'sku-bg0680-bk',
      status: 'active',
    },
  ])
  .onConflictDoNothing();

await closeDatabase();
