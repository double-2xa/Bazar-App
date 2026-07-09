import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './GlassView';
import { colors, spacing, typography, radius } from '@/theme';

interface GlassSearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
  onPress?: () => void;
}

export function GlassSearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search products, brands...',
  style,
  editable = true,
  onPress,
  ...inputProps
}: GlassSearchBarProps) {
  const content = (
    <GlassView style={[styles.container, style]} intensity={60}>
      <View style={styles.inner}>
        <Ionicons name="search" size={20} color={colors.mutedText} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          editable={editable}
          accessibilityLabel="Search products"
          {...inputProps}
        />
        {value.length > 0 && onClear ? (
          <TouchableOpacity onPress={onClear} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={colors.mutedText} />
          </TouchableOpacity>
        ) : null}
      </View>
    </GlassView>
  );

  if (onPress && !editable) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
});
