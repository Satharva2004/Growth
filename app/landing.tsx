
import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Platform, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isLight = colorScheme === 'light';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isLight ? 'dark' : 'light'} />

            {/* Background Gradient Blob or similar soft element could go here */}
            {/* Keeping it clean and minimal as per Soft UI */}

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
                        <View style={[styles.tag, { backgroundColor: theme.success + '20' }]}>
                            <Text style={[styles.tagText, { color: theme.success }]}>v1.0</Text>
                        </View>
                    </Animated.View>

                    {/* Main Visual */}
                    <View style={styles.centerStage}>
                        <Animated.View
                            entering={FadeInUp.delay(300).duration(1000).springify()}
                            style={[styles.illustrationContainer, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                        >
                            {/* Placeholder for a soft illustration or logo */}
                            <Text style={{ fontSize: 40, fontFamily: 'SpaceGrotesk_700Bold', color: theme.primary }}>C</Text>
                        </Animated.View>

                        <View style={{ alignItems: 'center', gap: 12 }}>
                            <Animated.Text
                                entering={FadeInUp.delay(500)}
                                style={[styles.title, { color: theme.text }]}
                            >
                                Clarity
                            </Animated.Text>
                            <Animated.Text
                                entering={FadeInUp.delay(600)}
                                style={[styles.description, { color: theme.subtleText }]}
                            >
                                Track expenses with precision. Your financial goals, simplified and beautiful.
                            </Animated.Text>
                        </View>
                    </View>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <Animated.View entering={FadeInUp.delay(800)} style={{ width: '100%' }}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    { backgroundColor: theme.buttonBackground, transform: [{ scale: pressed ? 0.98 : 1 }] }
                                ]}
                                onPress={() => router.push('/signup')}
                            >
                                <Text style={[styles.primaryButtonText, { color: theme.buttonText }]}>Get Started</Text>
                            </Pressable>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(900)} style={{ width: '100%' }}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.secondaryButton,
                                    { backgroundColor: theme.surface, ...theme.cardShadow, transform: [{ scale: pressed ? 0.98 : 1 }] }
                                ]}
                                onPress={() => router.push('/login')}
                            >
                                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Log In</Text>
                            </Pressable>
                        </Animated.View>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        paddingTop: 20,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    centerStage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    illustrationContainer: {
        width: 120,
        height: 120,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontFamily: 'SpaceGrotesk_700Bold',
        textAlign: 'center',
    },
    description: {
        textAlign: 'center',
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_400Regular',
        maxWidth: '80%',
        lineHeight: 24,
    },
    footer: {
        width: '100%',
        gap: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        borderRadius: 30,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
});
