import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { useT } from '../../src/i18n';

export default function TabsLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          borderTopWidth: 0.5,
          height: 72,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: theme.color.brand,
        tabBarInactiveTintColor: theme.color.onSurfaceSecondary,
        tabBarLabelStyle: { fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tab.today'), tabBarIcon: ({ color }) => <Feather name="sun" size={20} color={color} /> }} />
      <Tabs.Screen name="coach" options={{ title: t('tab.coach'), tabBarIcon: ({ color }) => <Feather name="message-circle" size={20} color={color} /> }} />
      <Tabs.Screen name="protocol" options={{ title: t('tab.protocol'), tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: t('tab.library'), tabBarIcon: ({ color }) => <Feather name="zap" size={20} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tab.profile'), tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} /> }} />
    </Tabs>
  );
}
