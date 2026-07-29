import type { PropsWithChildren, ReactNode } from 'react';

export type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer?: ReactNode;
}>;
