import { Menu } from 'heroui-native/menu';

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
  return (
    <Menu>
      <Menu.Trigger
        className={`min-h-11 flex-row items-center gap-2 self-start rounded-pill border px-4 ${
          selectedId !== 'all' ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
        }`}>
        <AppText numberOfLines={1} variant="caption" tone={selectedId !== 'all' ? 'brand' : 'muted'}>{label}</AppText>
        <AppIcon name="chevronDown" size={17} tone={selectedId !== 'all' ? 'brand' : 'muted'} />
      </Menu.Trigger>
      <Menu.Portal unstable_accessibilityContainerViewIsModal>
        <Menu.Overlay />
        <Menu.Content presentation="popover" width={240}>
          {options.map((option) => (
            <Menu.Item
              id={option.id}
              isSelected={selectedId === option.id}
              key={option.id}
              onPress={() => onSelect(option.id)}>
              <Menu.ItemIndicator />
              <Menu.ItemTitle>{option.label}</Menu.ItemTitle>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
