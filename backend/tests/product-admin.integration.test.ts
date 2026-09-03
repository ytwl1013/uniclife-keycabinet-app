import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/app/server.js';
import { env } from '../src/common/config/env.js';

const databaseTest = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;

function preprocessedImage(marker: string) {
  const bytes = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([12, 0, 0, 0]),
    Buffer.from('WEBP'),
    Buffer.from(marker),
  ]);
  return {
    data: bytes.toString('base64'),
    mimeType: 'image/webp' as const,
    byteSize: bytes.byteLength,
    width: 320,
    height: 240,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

databaseTest('admin product workflow', () => {
  it('creates an immutable SKU and QR while allowing preprocessed image and description updates', async () => {
    expect(env.ADMIN_API_TOKEN).toBeTruthy();
    const app = await buildServer();
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const sku = `QA-${runId}`.toUpperCase();
    const adminHeaders = { authorization: `Bearer ${env.ADMIN_API_TOKEN}` };
    const editable = {
      model: `QA Model ${runId}`,
      name: 'QA Product',
      color: 'Black',
      capacity: 8,
      description: 'Created through the Admin API',
      manualUrl: 'https://example.com/manual',
    };

    const createdResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: adminHeaders,
      payload: { ...editable, sku: sku.toLowerCase(), image: preprocessedImage('create') },
    });
    expect(createdResponse.statusCode).toBe(201);
    const created = createdResponse.json().data;
    expect(created).toMatchObject({
      sku,
      capacityEditable: true,
      cabinetCount: 0,
      image: { mimeType: 'image/webp', version: 1 },
      version: 0,
    });
    expect(created.qr.code).toMatch(new RegExp(`^uniclife://cabinet/v1/init/${sku}/`));
    const originalQr = created.qr.code as string;

    const updatedResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/products/${created.id}`,
      headers: adminHeaders,
      payload: {
        ...editable,
        name: 'QA Product Updated',
        description: 'Description and product image were updated',
        manualUrl: '',
        expectedVersion: created.version,
        sku: 'ATTEMPTED-SKU-CHANGE',
        image: preprocessedImage('updated'),
      },
    });
    expect(updatedResponse.statusCode).toBe(200);
    const updated = updatedResponse.json().data;
    expect(updated).toMatchObject({
      sku,
      name: 'QA Product Updated',
      description: 'Description and product image were updated',
      version: 1,
      image: { version: 2 },
    });
    expect(updated).not.toHaveProperty('manualUrl');
    expect(updated.qr.code).toBe(originalQr);

    const imageResponse = await app.inject({
      method: 'GET',
      url: updated.image.path,
    });
    expect(imageResponse.statusCode).toBe(200);
    expect(imageResponse.headers['content-type']).toContain('image/webp');
    expect(imageResponse.headers['cache-control']).toContain('immutable');
    expect(imageResponse.headers.etag).toBe(`"${updated.image.sha256}"`);
    const notModified = await app.inject({
      method: 'GET',
      url: updated.image.path,
      headers: { 'if-none-match': imageResponse.headers.etag },
    });
    expect(notModified.statusCode).toBe(304);
    const staleImage = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${created.id}/image?v=1`,
    });
    expect(staleImage.statusCode).toBe(404);
    expect(staleImage.json().code).toBe('PRODUCT_IMAGE_VERSION_NOT_FOUND');

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `product-${runId}@example.com`,
        password: 'password-123',
        displayName: 'Product Admin Test',
        locale: 'zh-CN',
        acceptedTerms: true,
        acceptedPrivacy: true,
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    const token = registerResponse.json().data.session.token as string;
    const initialized = await app.inject({
      method: 'POST',
      url: '/api/v1/cabinets/initialize',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        productQrCode: originalQr,
        name: 'QA Cabinet',
        timeZone: 'Asia/Shanghai',
        requestId: `product-init-${runId}`,
      },
    });
    expect(initialized.statusCode).toBe(200);

    const lockedCapacity = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/products/${created.id}`,
      headers: adminHeaders,
      payload: {
        ...editable,
        name: updated.name,
        description: updated.description,
        capacity: editable.capacity + 1,
        expectedVersion: updated.version,
      },
    });
    expect(lockedCapacity.statusCode).toBe(409);
    expect(lockedCapacity.json().code).toBe('PRODUCT_CAPACITY_LOCKED');

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/products/${created.id}`,
      headers: adminHeaders,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().data).toMatchObject({
      sku,
      capacity: editable.capacity,
      capacityEditable: false,
      cabinetCount: 1,
      qr: { code: originalQr },
    });

    await app.close();
  });
});
