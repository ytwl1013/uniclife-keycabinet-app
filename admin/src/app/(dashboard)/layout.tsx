import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Sidebar } from '@/components/sidebar';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen">
      <Sidebar username={session.username} />
      <main className="ml-[238px] min-h-screen px-7 py-7 max-md:ml-0 max-md:px-4 max-md:py-5">
        <div className="mx-auto w-full max-w-[1380px]">{children}</div>
      </main>
    </div>
  );
}
