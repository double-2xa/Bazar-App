import React from 'react';
import { ScrollView, StyleSheet, ViewStyle, StyleProp, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
}

export function ScreenContainer({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  bottomInset = spacing.tabBarOffset,
  style,
  ...scrollProps
}: ScreenContainerProps) {
  if (!scroll) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingBottom: bottomInset }, style]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
});
