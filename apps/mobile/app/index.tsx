import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BRAND } from '@doublea/shared';
import { colors, typography, spacing } from '@/theme';
import { useAuthStore } from '@/store/authStore';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { isLoading, user } = useAuthStore();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (user?.role === 'delivery_agent') {
        router.replace('/(delivery)');
      } else if (user?.role === 'admin') {
        useAuthStore.getState().logout();
        router.replace('/(tabs)');
      } else {
        router.replace('/(tabs)');
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  return (
    <LinearGradient colors={[colors.deepRed, colors.primary]} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoMark}>NP</Text>
        </View>
        <Text style={styles.title}>{BRAND.shopName}</Text>
        <Text style={styles.slogan}>{BRAND.tagline}</Text>
      </Animated.View>
      <View style={styles.loader}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotDelay1]} />
        <View style={[styles.dot, styles.dotDelay2]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: colors.brandYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoMark: { fontSize: 32, fontWeight: '800', color: colors.deepRed },
  title: { ...typography.h1, color: colors.surface, marginBottom: spacing.sm },
  slogan: { ...typography.body, color: colors.brandYellow },
  loader: { flexDirection: 'row', position: 'absolute', bottom: 80, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotDelay1: { opacity: 0.6 },
  dotDelay2: { opacity: 0.3 },
});
