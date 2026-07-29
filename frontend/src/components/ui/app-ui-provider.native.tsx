import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function AppUiProvider({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView
      onLayout={({ nativeEvent }) => {
        if (__DEV__) {
          console.info('[boot] native root layout', nativeEvent.layout);
        }
      }}
      style={{ flex: 1 }}>
      {children}
      {__DEV__ ? (
        <View pointerEvents="none" style={styles.probe}>
          <Text style={styles.probeText}>NATIVE ROOT OK</Text>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  probe: {
    position: 'absolute',
    top: 52,
    right: 12,
    zIndex: 9999,
    borderRadius: 6,
    backgroundColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  probeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
