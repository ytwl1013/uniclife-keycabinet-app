import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';

export function BorrowedKeysFilterMenu({
  label,
  onSelect,
  options,
  selectedId,
}: {
  label: string;
  onSelect: (id: string) => void;
  options: { id: string; label: string }[];
  selectedId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className="relative self-start">
      <Pressable
        accessibilityRole="button"
        className={`min-h-11 flex-row items-center gap-2 rounded-pill border px-4 ${
          selectedId !== 'all' ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
        } active:opacity-70`}
        onPress={() => setIsOpen((value) => !value)}>
        <AppText numberOfLines={1} variant="caption" tone={selectedId !== 'all' ? 'brand' : 'muted'}>{label}</AppText>
        <AppIcon name="chevronDown" size={17} tone={selectedId !== 'all' ? 'brand' : 'muted'} />
      </Pressable>
      {isOpen ? (
        <View
          accessibilityRole="menu"
          className="absolute left-0 top-12 z-50 min-w-56 gap-1 rounded-card border border-line bg-surface p-2 shadow-card">
          {options.map((option) => (
            <Pressable
              accessibilityRole="menuitem"
              accessibilityState={{ selected: selectedId === option.id }}
              className={`min-h-11 flex-row items-center gap-2 rounded-control px-3 ${selectedId === option.id ? 'bg-brand-soft' : ''} active:opacity-70`}
              key={option.id}
              onPress={() => {
                onSelect(option.id);
                setIsOpen(false);
              }}>
              <View className="w-5 items-center">
                {selectedId === option.id ? <AppIcon name="check" size={17} tone="brand" /> : null}
              </View>
              <AppText variant="body" tone="foreground">{option.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
