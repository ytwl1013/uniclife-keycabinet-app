import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';

export type SwipeSegmentPage<T extends string> = {
  content: ReactNode;
  value: T;
};

export type SwipeSegmentPagerProps<T extends string> = {
  onChange: (value: T) => void;
  pages: readonly SwipeSegmentPage<T>[];
  testID?: string;
  value: T;
};

export function SwipeSegmentPager<T extends string>({
  onChange,
  pages,
  testID,
  value,
}: SwipeSegmentPagerProps<T>) {
  const pagerRef = useRef<PagerView>(null);
  const selectedIndex = useMemo(
    () => Math.max(0, pages.findIndex((page) => page.value === value)),
    [pages, value],
  );

  useEffect(() => {
    pagerRef.current?.setPage(selectedIndex);
  }, [selectedIndex]);

  return (
    <PagerView
      ref={pagerRef}
      initialPage={selectedIndex}
      onPageSelected={(event) => {
        const page = pages[event.nativeEvent.position];
        if (page && page.value !== value) onChange(page.value);
      }}
      overdrag
      style={{ flex: 1 }}
      testID={testID}>
      {pages.map((page) => (
        <View collapsable={false} key={page.value} style={{ flex: 1 }}>
          {page.content}
        </View>
      ))}
    </PagerView>
  );
}
