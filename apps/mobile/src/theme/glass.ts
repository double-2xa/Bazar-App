import { Platform } from 'react-native';
import { colors } from './colors';

export const glass = {
  blurIntensity: Platform.OS === 'ios' ? 72 : 0,
  tint: 'light' as const,
  background: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.68)' : 'rgba(255, 255, 255, 0.94)',
  backgroundDark: Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.92)',
  border: colors.glassBorder,
  borderWidth: Platform.OS === 'ios' ? 0.5 : 1,
  tabBarRadius: 28,
  cardRadius: 20,
  headerRadius: 24,
  useBlur: Platform.OS === 'ios',
};
