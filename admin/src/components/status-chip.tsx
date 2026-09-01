import { Chip } from '@heroui/react';

export function UserStatusChip({ status }: { status: 'active' | 'disabled' }) {
  return (
    <Chip color={status === 'active' ? 'success' : 'danger'} size="sm" variant="soft">
      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status === 'active' ? '正常' : '已停用'}
    </Chip>
  );
}

export function ResultChip({ result }: { result: 'success' | 'failure' }) {
  return (
    <Chip color={result === 'success' ? 'success' : 'danger'} size="sm" variant="soft">
      {result === 'success' ? '成功' : '失败'}
    </Chip>
  );
}
