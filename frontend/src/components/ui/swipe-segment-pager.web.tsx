import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent, ScrollView, View } from 'react-native';

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
  const scrollRef = useRef<ScrollView>(null);
  const programmaticTargetRef = useRef<number | null>(null);
  const [width, setWidth] = useState(0);
  const selectedIndex = useMemo(
    () => Math.max(0, pages.findIndex((page) => page.value === value)),
    [pages, value],
  );

  useEffect(() => {
    if (!width) return;
    const target = selectedIndex * width;
    programmaticTargetRef.current = target;
    scrollRef.current?.scrollTo({ animated: true, x: target });
  }, [selectedIndex, width]);

  const updateWidth = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const syncSelectedPage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const offset = event.nativeEvent.contentOffset.x;
    const programmaticTarget = programmaticTargetRef.current;
    if (programmaticTarget !== null) {
      if (Math.abs(offset - programmaticTarget) <= 1) programmaticTargetRef.current = null;
      return;
    }
    const index = Math.round(offset / width);
    const page = pages[index];
    if (page && page.value !== value) onChange(page.value);
  };
  const finishScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    programmaticTargetRef.current = null;
    syncSelectedPage(event);
  };

  return (
    <View className="min-w-0 flex-1 overflow-hidden" onLayout={updateWidth} testID={testID}>
      <ScrollView
        ref={scrollRef}
        bounces={false}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={finishScroll}
        onScroll={syncSelectedPage}
        onScrollEndDrag={finishScroll}
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}>
        {pages.map((page) => (
          <View key={page.value} style={{ flex: 1, width: width || 1 }}>
            {page.content}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
