
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform, View, Image, StyleSheet } from 'react-native';

import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

function TabBarIcon(props: {
    name: React.ComponentProps<typeof FontAwesome>['name'];
    color: string;
}) {
    return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.text,
                tabBarInactiveTintColor: theme.tabIconDefault,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    height: Platform.OS === 'ios' ? 105 : 88,
                    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
                    paddingTop: 12,
                    ...theme.cardShadow,
                    borderTopWidth: 0,
                    elevation: 20,
                    shadowOpacity: 0.1,
                },
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontFamily: 'SpaceGrotesk_500Medium',
                    fontSize: 10,
                    marginBottom: 10,
                },
                headerShown: false,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <TabBarIcon name={focused ? "home" : "home"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="transfer"
                options={{
                    title: 'Transfer',
                    tabBarIcon: ({ color }) => <TabBarIcon name="exchange" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => (
                        <View style={[
                            styles.profileIconContainer,
                            { borderColor: theme.accent }
                        ]}>
                            {user?.photo ? (
                                <Image
                                    source={{ uri: user.photo }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={[styles.profileImage, { backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' }]}>
                                    <FontAwesome name="user" size={12} color={theme.accentText} />
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    profileIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    }
});
