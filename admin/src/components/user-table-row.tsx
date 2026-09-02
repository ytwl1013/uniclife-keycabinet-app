'use client';

import type { AdminUser } from '@uniclife/shared';
import { Avatar } from '@heroui/react';
import { ChevronRight, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, MouseEvent } from 'react';

import { formatDateTime } from '@/lib/format';

import { UserStatusChip } from './status-chip';
import { UserStatusButton } from './user-status-button';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));
}

export function UserTableRow({ user }: { user: AdminUser }) {
  const router = useRouter();
  const detailHref = `/users/${encodeURIComponent(user.id)}`;

  function openDetails(event: MouseEvent<HTMLTableRowElement>) {
    if (!isInteractiveTarget(event.target)) router.push(detailHref);
  }

  function openDetailsWithKeyboard(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    router.push(detailHref);
  }

  return (
    <tr
      aria-label={`查看用户 ${user.displayName} 的详情`}
      className="group cursor-pointer outline-none transition-colors focus-visible:bg-blue-50/70"
      onClick={openDetails}
      onKeyDown={openDetailsWithKeyboard}
      tabIndex={0}
    >
      <td>
        <div className="flex items-center gap-3">
          <Avatar color="accent" size="sm" variant="soft">
            <Avatar.Fallback>{user.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <span className="min-w-0">
            <Link
              className="block max-w-56 truncate text-xs font-semibold text-zinc-800 group-hover:text-blue-700"
              href={detailHref}
            >
              {user.displayName}
            </Link>
            <span className="block max-w-56 truncate text-[11px] text-zinc-400">{user.email}</span>
          </span>
        </div>
      </td>
      <td><UserStatusChip status={user.status} /></td>
      <td>
        <span className="block text-xs font-medium text-zinc-700">{user.loginCount} 次</span>
        <span className="mt-0.5 block text-[10px] text-zinc-400">最近：{formatDateTime(user.lastLoginAt)}</span>
      </td>
      <td>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
          <UsersRound aria-hidden="true" className="text-zinc-400" size={14} /> {user.cabinetCount}
        </span>
      </td>
      <td className="whitespace-nowrap text-zinc-400">{formatDateTime(user.createdAt)}</td>
      <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-end gap-2">
          <Link
            aria-label={`查看 ${user.displayName} 的详情`}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            href={detailHref}
          >
            详情 <ChevronRight aria-hidden="true" size={13} />
          </Link>
          <UserStatusButton displayName={user.displayName} status={user.status} userId={user.id} />
        </div>
      </td>
    </tr>
  );
}
