import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { AppColors } from '@/styles/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.blue,
        tabBarInactiveTintColor: AppColors.muted,
        tabBarStyle: {
          alignSelf: 'center',
          backgroundColor: AppColors.surface,
          borderTopColor: AppColors.line,
          height: 76,
          maxWidth: 480,
          paddingBottom: 12,
          paddingTop: 8,
          width: '100%',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="home" size={27} />,
        }}
      />
      <Tabs.Screen
        name="cabinets"
        options={{
          title: 'Cabinets',
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="kitchen" size={27} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              color={focused ? '#ffffff' : color}
              name="qr-code-scanner"
              size={focused ? 29 : 27}
              style={focused ? { backgroundColor: AppColors.blue, borderRadius: 28, padding: 12 } : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="schedule" size={27} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="groups" size={27} />,
        }}
      />
    </Tabs>
  );
}
