import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '@/theme';
import { WebLayoutProvider, createWebLayoutValue } from '@/layout/webLayout';

/**
 * Full-bleed web shell. Native apps use WebAppFrame.tsx (passthrough) instead.
 */
export function WebAppFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const layout = useMemo(() => createWebLayoutValue(width), [width]);

  return (
    <WebLayoutProvider value={layout}>
      <View style={styles.shell}>
        <View style={styles.stage}>{children}</View>
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
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
});
