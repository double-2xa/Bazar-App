import React, { cloneElement, useRef, useState, type ReactElement } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';

type ScrollableChild = ReactElement<{
  ref?: React.Ref<unknown>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange?: (width: number, height: number) => void;
  onLayout?: (event: { nativeEvent: { layout: { width: number } } }) => void;
  scrollEventThrottle?: number;
}>;

type HorizontalNavRowProps = {
  children: ScrollableChild;
  step?: number;
  style?: StyleProp<ViewStyle>;
  /** When true, arrows show on all platforms. Default: web only. */
  alwaysShow?: boolean;
  /** When false, hide nav buttons entirely. */
  enabled?: boolean;
};

export function HorizontalNavRow({
  children,
  step = 280,
  style,
  alwaysShow = false,
  enabled = true,
}: HorizontalNavRowProps) {
  const showButtons = enabled && (alwaysShow || Platform.OS === 'web');
  const scrollerRef = useRef<{
    scrollToOffset?: (opts: { offset: number; animated?: boolean }) => void;
    scrollTo?: (opts: { x?: number; animated?: boolean }) => void;
  } | null>(null);
  const offsetX = useRef(0);
  const contentWidth = useRef(0);
  const layoutWidth = useRef(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const refreshEdges = (x = offsetX.current) => {
    const max = Math.max(0, contentWidth.current - layoutWidth.current);
    offsetX.current = x;
    setCanPrev(x > 8);
    setCanNext(max > 8 && x < max - 8);
  };

  const scrollBy = (direction: -1 | 1) => {
    const max = Math.max(0, contentWidth.current - layoutWidth.current);
    const next = Math.max(0, Math.min(offsetX.current + direction * step, max));
    if (scrollerRef.current?.scrollToOffset) {
      scrollerRef.current.scrollToOffset({ offset: next, animated: true });
    } else if (scrollerRef.current?.scrollTo) {
      scrollerRef.current.scrollTo({ x: next, animated: true });
    }
    refreshEdges(next);
  };

  const child = cloneElement(children, {
    ref: (node: typeof scrollerRef.current) => {
      scrollerRef.current = node;
      const { ref } = children as { ref?: React.Ref<unknown> };
      if (typeof ref === 'function') ref(node);
      else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<unknown>).current = node;
    },
    scrollEventThrottle: 16,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      contentWidth.current = contentSize.width;
      layoutWidth.current = layoutMeasurement.width;
      refreshEdges(contentOffset.x);
      children.props.onScroll?.(event);
    },
    onContentSizeChange: (width: number, height: number) => {
      contentWidth.current = width;
      refreshEdges();
      children.props.onContentSizeChange?.(width, height);
    },
    onLayout: (event: { nativeEvent: { layout: { width: number } } }) => {
      layoutWidth.current = event.nativeEvent.layout.width;
      refreshEdges();
      children.props.onLayout?.(event);
    },
  });

  return (
    <View style={[styles.wrap, style]}>
      {child}
      {showButtons ? (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scroll left"
            disabled={!canPrev}
            onPress={() => scrollBy(-1)}
            style={[styles.button, styles.left, !canPrev && styles.buttonDisabled]}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={20} color={canPrev ? colors.text : colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scroll right"
            disabled={!canNext}
            onPress={() => scrollBy(1)}
            style={[styles.button, styles.right, !canNext && styles.buttonDisabled]}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-forward" size={20} color={canNext ? colors.text : colors.mutedText} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  button: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...shadows.md,
  },
  left: { left: spacing.sm },
  right: { right: spacing.sm },
  buttonDisabled: {
    opacity: 0.35,
  },
});
