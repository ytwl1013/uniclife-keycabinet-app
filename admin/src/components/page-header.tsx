import { Chip } from '@heroui/react';
import { Radio } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  environment,
  actions,
}: {
  title: string;
  description: string;
  environment: 'dev' | 'pro';
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex items-start justify-between gap-4 max-sm:flex-col">
      <div>
        <div className="mb-2 flex items-center gap-2.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-zinc-950">{title}</h1>
          <Chip color={environment === 'pro' ? 'success' : 'accent'} size="sm" variant="soft">
            <Radio aria-hidden="true" className="mr-1" size={11} />
            {environment === 'pro' ? 'PRO SERVER' : 'LOCAL DEV'}
          </Chip>
        </div>
        <p className="text-[13px] leading-5 text-zinc-500">{description}</p>
      </div>
      {actions}
    </header>
  );
}
