import { describe, expect, it, vi } from 'vitest';

import { issueSession } from '../src/common/auth/session.js';
import type { DbExecutor } from '../src/db/client.js';

function executorProbe() {
  const values = vi.fn().mockResolvedValue(undefined);
  const executor = {
    insert: vi.fn(() => ({ values })),
  } as unknown as DbExecutor;
  return { executor, values };
}

describe('session issuance', () => {
  it('issues persistent mobile sessions without an expiry timestamp', async () => {
    const { executor, values } = executorProbe();

    const session = await issueSession(executor, 'user-mobile', { persistent: true });

    expect(session.expiresAt).toBeNull();
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      expiresAt: null,
      userId: 'user-mobile',
    }));
  });

  it('keeps a configured expiry for non-persistent sessions', async () => {
    const { executor, values } = executorProbe();
    const startedAt = Date.now();

    const session = await issueSession(executor, 'user-web');

    expect(Date.parse(session.expiresAt!)).toBeGreaterThan(startedAt);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      expiresAt: session.expiresAt,
      userId: 'user-web',
    }));
  });
});
