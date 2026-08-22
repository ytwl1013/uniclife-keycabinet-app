import { env } from '../common/config/env.js';
import { closeDatabase, requireDatabase } from './client.js';
import { cabinetQrs, productSkus } from './schema.js';

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
  .insert(cabinetQrs)
  .values([
    {
      id: 'qr-bg5163-bk-unbound',
      code: 'uniclife://cabinet/BG5163-BK/6abafe6b-2328-43e1-a461-70d3b660e5ef',
      skuId: 'sku-bg5163-bk',
      deviceUuid: '6abafe6b-2328-43e1-a461-70d3b660e5ef',
      status: 'active',
    },
    {
      id: 'qr-bg0680-bk-unbound',
      code: 'uniclife://cabinet/BG0680-BK/2e2474ee-889a-4489-8bec-50ac5a054d37',
      skuId: 'sku-bg0680-bk',
      deviceUuid: '2e2474ee-889a-4489-8bec-50ac5a054d37',
      status: 'active',
    },
  ])
  .onConflictDoNothing();

await closeDatabase();
