import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { useTranslation } from '@/i18n';

export type SpotlightRect = { x: number; y: number; width: number; height: number };

export function HomeSpotlightGuide({
  onBack,
  onClose,
  onNext,
  placement = 'auto',
  rect,
  description,
  nextLabel,
  rectOffsetY = 0,
  step,
  title,
  total,
  visible,
}: {
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  placement?: 'auto' | 'top' | 'bottom';
  rect?: SpotlightRect;
  description?: string;
  nextLabel?: string;
  rectOffsetY?: number;
  step: number;
  title?: string;
  total: number;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!visible || !rect) return null;

  const padding = 6;
  const spotlightX = Math.max(0, rect.x - padding);
  const spotlightY = Math.max(0, rect.y + rectOffsetY - padding);
  const spotlight = {
    x: spotlightX,
    y: spotlightY,
    width: Math.max(0, Math.min(width - spotlightX, rect.width + padding * 2)),
    height: Math.max(0, Math.min(height - spotlightY, rect.height + padding * 2)),
  };
  const last = step === total - 1;
  const cardPlacement = placement === 'auto'
    ? (spotlight.y > height * 0.55 ? 'top' : 'bottom')
    : placement;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View accessibilityViewIsModal className="flex-1" testID="home-spotlight-guide">
        <Svg height={height} pointerEvents="none" style={{ left: 0, position: 'absolute', top: 0 }} width={width}>
          <Defs>
            <Mask id="home-guide-mask">
              <Rect fill="white" height={height} width={width} x={0} y={0} />
              <Rect
                fill="black"
                height={spotlight.height}
                rx={18}
                ry={18}
                width={spotlight.width}
                x={spotlight.x}
                y={spotlight.y}
              />
            </Mask>
          </Defs>
          <Rect fill="rgba(11, 18, 35, 0.78)" height={height} mask="url(#home-guide-mask)" width={width} x={0} y={0} />
        </Svg>
        <View
          className="absolute rounded-[18px] border-2 border-brand"
          pointerEvents="none"
          style={{ height: spotlight.height, left: spotlight.x, top: spotlight.y, width: spotlight.width }}
          testID={`home-spotlight-target-${step}`}
        />

        <View
          className="absolute inset-x-screen gap-4 rounded-card bg-surface p-5 shadow-card"
          style={cardPlacement === 'top' ? { top: insets.top + 16 } : { bottom: insets.bottom + 16 }}>
          <View className="gap-1">
            <AppText variant="caption" tone="brand">
              {t('home.guideProgress', { current: step + 1, total })}
            </AppText>
            <AppText variant="title" tone="foreground">{title ?? t(`home.guide.steps.${step}.title` as never)}</AppText>
            <AppText tone="muted">{description ?? t(`home.guide.steps.${step}.description` as never)}</AppText>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable accessibilityRole="button" className="min-h-11 justify-center px-2" onPress={onClose}>
              <AppText variant="label" tone="muted">{t('home.guideSkip')}</AppText>
            </Pressable>
            <View className="flex-1" />
            {step > 0 ? (
              <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-control border border-line px-4" onPress={onBack}>
                <AppText variant="label" tone="foreground">{t('home.guideBack')}</AppText>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-control bg-brand px-5" onPress={onNext}>
              <AppText variant="label" tone="onBrand">{nextLabel ?? t(last ? 'home.guideDone' : 'home.guideNext')}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
