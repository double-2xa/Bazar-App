import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { colors } from '@/theme';

interface IOSPageProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  bottomInset?: number;
}

export function IOSPage({ children, header, footer, scroll = true, style, bottomInset }: IOSPageProps) {
  return (
    <View style={[styles.page, style]}>
      {header}
      <ScreenContainer scroll={scroll} bottomInset={bottomInset} style={styles.flex}>
        {children}
      </ScreenContainer>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
