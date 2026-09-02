import { createEntityId } from '../../common/security/ids.js';
import type { DbExecutor } from '../../db/client.js';
import { auditLogs } from '../../db/schema.js';

export type AuditInput = {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  result: 'success' | 'failure';
  reasonCode?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function appendAudit(executor: DbExecutor, input: AuditInput): Promise<void> {
  await executor.insert(auditLogs).values({
    id: createEntityId('audit'),
    actorId: input.actorId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    result: input.result,
    reasonCode: input.reasonCode,
    metadata: input.metadata ?? {},
  });
}
