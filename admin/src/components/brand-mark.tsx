import { KeyRound } from 'lucide-react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-ink text-white shadow-[0_8px_20px_rgba(20,23,28,0.18)]">
        <KeyRound aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-[-0.02em] text-ink">UnicLife</span>
          <span className="block text-[11px] text-zinc-400">Key Cabinet Admin</span>
        </span>
      )}
    </div>
  );
}
