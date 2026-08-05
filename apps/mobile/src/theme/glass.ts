import { Platform } from 'react-native';
import { colors } from './colors';

export const glass = {
  blurIntensity: Platform.OS === 'ios' ? 72 : 0,
  tint: 'light' as const,
  // Lighter material for interactive surfaces (Apple materials hierarchy)
  background: Platform.OS === 'ios' ? 'rgba(255, 252, 245, 0.62)' : 'rgba(255, 252, 245, 0.94)',
  backgroundDark: Platform.OS === 'ios' ? 'rgba(31, 31, 31, 0.68)' : 'rgba(31, 31, 31, 0.92)',
  border: colors.glassBorder,
  borderWidth: Platform.OS === 'ios' ? 0.5 : 1,
  tabBarRadius: 28,
  cardRadius: 22,
  headerRadius: 24,
  useBlur: Platform.OS === 'ios',
};
