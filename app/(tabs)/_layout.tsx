
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark']; // Force dark/wireframe

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.subtleText,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.text,
          backgroundColor: theme.background,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Courier',
          fontWeight: 'bold',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          // ensure consistent spacing
        },
        tabBarHideOnKeyboard: true,
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.text,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: 'Courier',
          fontWeight: 'bold',
          fontSize: 18,
          color: theme.text,
          letterSpacing: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'SYSTEM_MAIN',
          tabBarLabel: 'DASHBOARD',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'TARGET_DATA',
          tabBarLabel: 'GOALS',
          tabBarIcon: ({ color }) => <TabBarIcon name="crosshairs" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'USER_CONFIG',
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-secret" color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
