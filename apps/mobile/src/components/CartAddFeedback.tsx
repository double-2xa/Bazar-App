import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing, typography } from '@/theme';
import { useAppLayoutWidth } from '@/layout/webLayout';
import { useCartFeedbackStore } from '@/store/cartFeedbackStore';

export function CartAddFeedback() {
  const event = useCartFeedbackStore((state) => state.event);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const contentWidth = useAppLayoutWidth();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visibleEventId, setVisibleEventId] = useState<number | null>(null);
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(1)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!event) return;

    setVisibleEventId(event.id);
    AccessibilityInfo.announceForAccessibility(
      `${event.quantity} ${event.productName} added to cart`,
    );

    x.stopAnimation();
    y.stopAnimation();
    flyOpacity.stopAnimation();
    flyScale.stopAnimation();
    toastOpacity.stopAnimation();
    toastY.stopAnimation();

    const stageLeft = Platform.OS === 'web' ? Math.max(0, (windowWidth - contentWidth) / 2) : 0;
    const startX = Math.max(12, Math.min(contentWidth - 56, (event.origin?.x ?? contentWidth / 2) - stageLeft - 22));
    const startY = Math.max(80, Math.min(windowHeight - 140, (event.origin?.y ?? windowHeight * 0.55) - 22));
    // Cart is centered as the third destination in the five-item bottom navigation.
    const targetX = contentWidth * (2.5 / 5) - 22;
    const targetY = windowHeight - (Platform.OS === 'ios' ? 78 : 64);

    x.setValue(startX);
    y.setValue(startY);
    flyScale.setValue(1);
    flyOpacity.setValue(reduceMotion ? 0 : 0.96);
    toastOpacity.setValue(0);
    toastY.setValue(reduceMotion ? 0 : 10);

    const toastIn = Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: reduceMotion ? 120 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(toastY, {
        toValue: 0,
        duration: reduceMotion ? 120 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const fly = reduceMotion
      ? Animated.delay(0)
      : Animated.parallel([
          Animated.spring(x, {
            toValue: targetX,
            damping: 20,
            stiffness: 190,
            mass: 0.75,
            useNativeDriver: true,
          }),
          Animated.spring(y, {
            toValue: targetY,
            damping: 20,
            stiffness: 190,
            mass: 0.75,
            useNativeDriver: true,
          }),
          Animated.timing(flyScale, {
            toValue: 0.38,
            duration: 430,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);

    Animated.parallel([toastIn, fly]).start(() => {
      flyOpacity.setValue(0);
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setVisibleEventId(null));
    });
  }, [contentWidth, event, flyOpacity, flyScale, reduceMotion, toastOpacity, toastY, windowHeight, windowWidth, x, y]);

  if (!event || visibleEventId !== event.id) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {!reduceMotion ? (
        <Animated.View
          style={[
            styles.flyingItem,
            {
              opacity: flyOpacity,
              transform: [{ translateX: x }, { translateY: y }, { scale: flyScale }],
            },
          ]}
        >
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.flyingImage} />
          ) : (
            <Ionicons name="cube" size={22} color={colors.primary} />
          )}
        </Animated.View>
      ) : null}

      <Animated.View
        accessibilityRole="alert"
        style={[styles.toast, { opacity: toastOpacity, transform: [{ translateY: toastY }] }]}
      >
        <View style={styles.checkmark}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.toastCopy}>
          <Text style={styles.toastTitle}>Added to cart</Text>
          <Text style={styles.toastSubtitle} numberOfLines={1}>
            {event.quantity > 1 ? `${event.quantity} × ` : ''}{event.productName}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flyingItem: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    zIndex: 1001,
    ...shadows.md,
  },
  flyingImage: { width: '100%', height: '100%' },
  toast: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    maxWidth: 360,
    width: '88%',
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1002,
    ...shadows.md,
  },
  checkmark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  toastCopy: { flex: 1 },
  toastTitle: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  toastSubtitle: { ...typography.caption, color: colors.mutedText, marginTop: 1 },
});
