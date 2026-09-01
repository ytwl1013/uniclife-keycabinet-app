import { act, render, renderHook } from '@testing-library/react-native';

import { ActivityTimelineItem } from '../src/features/activity/components/activity-timeline';
import {
  ACTIVITY_PAGE_SIZE,
  useActivityPagination,
} from '../src/features/activity/use-activity-pagination';
import type { EventView } from '../src/features/cabinet-prototype/types';

jest.mock('@/components/ui/app-icon', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    AppIcon: (props: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: 'activity-icon' }),
  };
});

jest.mock('@/i18n', () => ({
  useTranslation: () => ({
    locale: 'zh-CN',
    t: (key: string, options?: { name?: string }) => {
      if (key === 'activity.operator') return `操作人：${options?.name}`;
      if (key === 'activity.borrower') return `借出人：${options?.name}`;
      if (key === 'activity.returner') return `归还人：${options?.name}`;
      return key;
    },
  }),
}));

const baseEvent: EventView = {
  id: 'event-1',
  cabinetId: 'cabinet-1',
  keyId: 'key-1',
  keyName: '前门钥匙',
  actorUserId: 'admin-1',
  actorName: '管理员王女士',
  kind: 'checkOut',
  createdAt: '2026-08-28T08:00:00.000Z',
  title: '借出了 前门钥匙',
  borrowerName: '借出人李先生',
};

describe('activity timeline', () => {
  it('shows only the first 20 entries and appends 20 more at the end', async () => {
    const entries = Array.from({ length: 45 }, (_, index) => index);
    const { result, rerender, unmount } = await renderHook(
      ({ resetKey }) => useActivityPagination(entries, resetKey),
      { initialProps: { resetKey: 'all' } },
    );

    expect(result.current.visibleEntries).toHaveLength(ACTIVITY_PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(result.current.visibleEntries).toHaveLength(40);

    await act(() => result.current.loadMore());
    expect(result.current.visibleEntries).toHaveLength(45);
    expect(result.current.hasMore).toBe(false);

    await rerender({ resetKey: 'returns' });
    expect(result.current.visibleEntries).toHaveLength(ACTIVITY_PAGE_SIZE);
    await unmount();
  });

  it('keeps the operator separate from the borrower and returner', async () => {
    const checkout = await render(<ActivityTimelineItem event={baseEvent} />);

    expect(checkout.getByText('操作人：管理员王女士')).toBeTruthy();
    expect(checkout.getByText('借出人：借出人李先生')).toBeTruthy();
    await checkout.unmount();

    const returned = await render(
      <ActivityTimelineItem event={{ ...baseEvent, id: 'event-2', kind: 'return' }} />,
    );
    expect(returned.getByText('操作人：管理员王女士')).toBeTruthy();
    expect(returned.getByText('归还人：借出人李先生')).toBeTruthy();
    await returned.unmount();
  });
});
