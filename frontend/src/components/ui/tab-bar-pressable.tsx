import {
  useState,
  type ComponentRef,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type ColorValue,
  type GestureResponderEvent,
} from 'react-native';
import { type BottomTabBarButtonProps } from 'expo-router/js-tabs';

import { useAppTheme } from '@/styles/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const androidSupportsRipple = Platform.OS === 'android' && Platform.Version >= 21;
const useNativeDriver = Platform.OS !== 'web';

type PressEvent = MouseEvent<HTMLAnchorElement> | GestureResponderEvent;

export function TabBarPressable({
  ref,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  android_ripple: androidRipple,
  pressColor,
  pressOpacity = 0.3,
  hoverEffect,
  style,
  children,
  ...rest
}: BottomTabBarButtonProps & {
  ref?: Ref<ComponentRef<typeof AnimatedPressable>>;
  pressColor?: ColorValue;
  pressOpacity?: number;
}) {
  const { mode } = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(1));

  const animateTo = (toValue: number, duration: number) => {
    if (androidSupportsRipple) return;

    Animated.timing(opacity, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver,
    }).start();
  };

  const handlePress = (event: PressEvent) => {
    if (Platform.OS === 'web' && rest.href !== null) {
      const hasModifierKey =
        ('metaKey' in event && event.metaKey) ||
        ('altKey' in event && event.altKey) ||
        ('ctrlKey' in event && event.ctrlKey) ||
        ('shiftKey' in event && event.shiftKey);
      const isLeftClick = 'button' in event ? event.button === 0 : true;
      const isSelfTarget =
        event.currentTarget && 'target' in event.currentTarget
          ? [undefined, null, '', 'self'].includes(event.currentTarget.target)
          : true;

      if (!hasModifierKey && isLeftClick && isSelfTarget) {
        event.preventDefault();
        onPress?.(event);
      }
      return;
    }

    onPress?.(event);
  };

  return (
    <AnimatedPressable
      ref={ref}
      accessible
      role={Platform.OS === 'web' && rest.href != null ? 'link' : 'button'}
      onPress={disabled ? undefined : handlePress}
      onPressIn={
        disabled
          ? undefined
          : (event) => {
              animateTo(pressOpacity, 0);
              onPressIn?.(event);
            }
      }
      onPressOut={
        disabled
          ? undefined
          : (event) => {
              animateTo(1, 200);
              onPressOut?.(event);
            }
      }
      android_ripple={
        androidSupportsRipple && !disabled
          ? {
              color:
                pressColor ??
                (mode === 'dark' ? 'rgba(255, 255, 255, .32)' : 'rgba(0, 0, 0, .32)'),
              ...androidRipple,
            }
          : undefined
      }
      style={[
        {
          cursor: (Platform.OS === 'web' || Platform.OS === 'ios') && !disabled ? 'pointer' : 'auto',
          opacity: !androidSupportsRipple && !disabled ? opacity : 1,
        },
        style,
      ]}
      {...rest}>
      {!disabled ? <HoverEffect {...hoverEffect} /> : null}
      {children}
    </AnimatedPressable>
  );
}

const hoverClassName = '__uniclife_tab_bar_pressable_hover';
const hoverCss = String.raw`
  .${hoverClassName} {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: var(--overlay-color);
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }

  a:hover > .${hoverClassName}, button:hover > .${hoverClassName} {
    opacity: var(--overlay-hover-opacity);
  }

  a:active > .${hoverClassName}, button:active > .${hoverClassName} {
    opacity: var(--overlay-active-opacity);
  }
`;

function HoverEffect({
  color,
  hoverOpacity = 0.08,
  activeOpacity = 0.16,
}: {
  color?: ColorValue;
  hoverOpacity?: number;
  activeOpacity?: number;
}) {
  if (Platform.OS !== 'web' || color == null) return null;

  const cssVariables = {
    '--overlay-color': String(color),
    '--overlay-hover-opacity': hoverOpacity,
    '--overlay-active-opacity': activeOpacity,
  } as CSSProperties & Record<`--${string}`, string | number>;

  return (
    <>
      <style href={hoverClassName} precedence="default">
        {hoverCss}
      </style>
      <div
        className={hoverClassName}
        style={cssVariables}
      />
    </>
  );
}
