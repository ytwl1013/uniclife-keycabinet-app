import { ReactNode, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, View } from 'react-native';

type ItemLayout = { width: number; x: number };

export type ScrollableChipRowProps<T> = {
  getKey?: (item: T) => string;
  items: readonly T[];
  renderItem: (item: T, selected: boolean) => ReactNode;
  selectedValue?: T;
  testID?: string;
};

export function ScrollableChipRow<T>({
  getKey = (item) => String(item),
  items,
  renderItem,
  selectedValue,
  testID,
}: ScrollableChipRowProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const itemLayouts = useRef(new Map<string, ItemLayout>());
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!selectedValue || !containerWidth || !contentWidth) return;
    const layout = itemLayouts.current.get(getKey(selectedValue));
    if (!layout) return;
    const centered = layout.x - Math.max(0, (containerWidth - layout.width) / 2);
    const maximum = Math.max(0, contentWidth - containerWidth);
    scrollRef.current?.scrollTo({ animated: true, x: Math.min(maximum, Math.max(0, centered)) });
  }, [containerWidth, contentWidth, getKey, selectedValue]);

  const rememberLayout = (key: string, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    itemLayouts.current.set(key, { width, x });
  };

  return (
    <View
      className="min-w-0 w-full overflow-hidden"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      testID={testID}>
      <ScrollView
        ref={scrollRef}
        alwaysBounceHorizontal={false}
        contentContainerStyle={{ alignItems: 'center', columnGap: 8, paddingRight: 8 }}
        directionalLockEnabled
        horizontal
        nestedScrollEnabled
        onContentSizeChange={(width) => setContentWidth(width)}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, width: '100%' }}>
        {items.map((item) => {
          const key = getKey(item);
          return (
            <View key={key} onLayout={(event) => rememberLayout(key, event)}>
              {renderItem(item, selectedValue !== undefined && key === getKey(selectedValue))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
