import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Sidebar } from '@/components/sidebar';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-dvh">
      <Sidebar username={session.username} />
      <main className="ml-[238px] min-h-dvh px-[clamp(1rem,2vw,3rem)] py-[clamp(1.25rem,2vw,2.25rem)] max-md:ml-0">
        <div className="flex min-h-[calc(100dvh-clamp(2.5rem,4vw,4.5rem))] w-full flex-col">{children}</div>
      </main>
    </div>
  );
}
