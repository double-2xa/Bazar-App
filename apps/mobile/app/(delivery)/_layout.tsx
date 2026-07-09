import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '@/theme';
import { GlassTabBarBackground, glassTabBarStyle } from '@/components';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAuthStore } from '@/store/authStore';

export default function DeliveryLayout() {
  const { isLoading } = useAuthStore();
  useRoleGuard({ allowed: 'delivery_agent' });

  if (isLoading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: glassTabBarStyle,
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        headerStyle: { backgroundColor: colors.secondary },
        headerTintColor: colors.surface,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Active',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: 'Done',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
