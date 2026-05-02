import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../../store/useThemeStore';

export default function TabLayout() {
  const { currentTheme } = useThemeStore();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: currentTheme.colors.tabBar.background,
        borderTopWidth: 1,
        borderTopColor: currentTheme.colors.tabBar.border,
        elevation: 0,
        height: 60,
        paddingBottom: 10,
      },
      tabBarActiveTintColor: currentTheme.colors.tabBar.active,
      tabBarInactiveTintColor: currentTheme.colors.tabBar.inactive,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alanım',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Yolculuk',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
