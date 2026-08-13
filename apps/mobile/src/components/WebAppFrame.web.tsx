import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { colors } from '@/theme';
import {
  WEB_PHONE_BREAKPOINT,
  WebLayoutProvider,
  createWebLayoutValue,
} from '@/layout/webLayout';

/**
 * Responsive web shell for phones, tablets, and laptops.
 * Native apps use WebAppFrame.tsx (passthrough) instead.
 */
export function WebAppFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const layout = useMemo(() => createWebLayoutValue(width), [width]);
  const isPhone = width < WEB_PHONE_BREAKPOINT;

  const shellStyle = useMemo(
    (): ViewStyle[] => (isPhone ? [styles.shell] : [styles.shell, styles.shellWide]),
    [isPhone],
  );

  const stageStyle = useMemo(
    (): ViewStyle[] => [
      styles.stage,
      {
        width: layout.width,
        maxWidth: '100%',
        ...(isPhone
          ? { flex: 1, height: '100%' }
          : ({
              flex: 1,
              height: '100%',
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.border,
              boxShadow: '0 0 0 1px rgba(31,31,31,0.04), 0 18px 48px rgba(31,31,31,0.08)',
            } as ViewStyle)),
      },
    ],
    [layout.width, isPhone],
  );

  return (
    <WebLayoutProvider value={layout}>
      <View style={shellStyle}>
        <View style={stageStyle}>
          <View style={styles.stageInner}>{children}</View>
        </View>
      </View>
    </WebLayoutProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100%',
    backgroundColor: colors.background,
  },
  shellWide: {
    alignItems: 'center',
    // Soft page backdrop beside the content column on large screens
    backgroundColor: colors.backgroundAlt,
  },
  stage: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  stageInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
