import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';

export default function TabsLayout() {
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
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'AUJOURD\'HUI',
          tabBarIcon: ({ color }) => <Feather name="sun" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="protocol"
        options={{
          title: 'RITUEL',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'LUMIÈRES',
          tabBarIcon: ({ color }) => <Feather name="zap" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFIL',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
