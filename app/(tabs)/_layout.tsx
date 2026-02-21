
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
    name: React.ComponentProps<typeof FontAwesome>['name'];
    color: string;
}) {
    return <FontAwesome size={18} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.text,
                tabBarInactiveTintColor: theme.tabIconDefault,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.divider,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 76 : 62,
                    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
                    paddingTop: 10,
                },
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontFamily: 'SpaceGrotesk_500Medium',
                    fontSize: 10,
                    marginTop: 2,
                },
                headerShown: false,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <TabBarIcon name="user-o" color={color} />,
                }}
            />
        </Tabs>
    );
}
