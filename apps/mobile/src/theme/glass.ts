import { Platform } from 'react-native';
import { colors } from './colors';

export const glass = {
  blurIntensity: Platform.OS === 'ios' ? 64 : 0,
  tint: 'light' as const,
  background: Platform.OS === 'ios' ? 'rgba(255, 252, 245, 0.72)' : 'rgba(255, 252, 245, 0.94)',
  backgroundDark: Platform.OS === 'ios' ? 'rgba(31, 31, 31, 0.72)' : 'rgba(31, 31, 31, 0.92)',
  border: colors.glassBorder,
  borderWidth: Platform.OS === 'ios' ? 0.5 : 1,
  tabBarRadius: 28,
  cardRadius: 20,
  headerRadius: 24,
  useBlur: Platform.OS === 'ios',
};
