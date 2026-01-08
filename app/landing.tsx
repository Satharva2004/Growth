
import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Platform, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, withRepeat, withTiming, withSequence, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');

// A simple technical "Crosshair" component for the corners
const Crosshair = ({ color }: { color: string }) => (
    <View style={{ width: 20, height: 20, position: 'absolute', borderColor: color, borderTopWidth: 1, borderLeftWidth: 1 }} />
);

export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark']; // Default to dark for this aesthetic if undefined

    // Force dark mode look for the "Seeker" aesthetic mostly, but respect theme if completely light
    const isLight = colorScheme === 'light';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isLight ? 'dark' : 'light'} />

            {/* Grid Pattern Background (Simulated with absolute views or loop? Keeping it simple for perf: Just solid background for now with some lines) */}
            <View style={styles.gridContainer}>
                {/* Horizontal Line */}
                <View style={[styles.gridLine, { backgroundColor: theme.subtleText, top: '30%', height: StyleSheet.hairlineWidth, width: '100%' }]} />
                <View style={[styles.gridLine, { backgroundColor: theme.subtleText, bottom: '30%', height: StyleSheet.hairlineWidth, width: '100%' }]} />

                {/* Vertical Line */}
                <View style={[styles.gridLine, { backgroundColor: theme.subtleText, left: '50%', width: StyleSheet.hairlineWidth, height: '100%' }]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
                        <View style={[styles.tag, { borderColor: theme.text }]}>
                            <Text style={[styles.tagText, { color: theme.text }]}>SYSTEM_READY</Text>
                        </View>
                        <Text style={[styles.dateText, { color: theme.subtleText }]}>
                            {new Date().toISOString().split('T')[0]} // V.1.0
                        </Text>
                    </Animated.View>

                    {/* Main Visual / Content */}
                    <View style={styles.centerStage}>

                        {/* The Wireframe Illustration */}
                        <Animated.View
                            entering={FadeInUp.delay(400).duration(1000).springify()}
                            style={styles.illustrationContainer}>

                            <Image
                                source={require('@/assets/images/wireframe_cube.png')}
                                style={styles.illustration}
                                resizeMode="contain"
                            />

                            <View style={styles.illustrationOverlay}>
                                <Text style={[styles.title, { color: theme.text }]}>CLARITY</Text>
                                <Text style={[styles.subtitle, { color: theme.text }]}>PROTOCOL</Text>
                            </View>

                            {/* Corner Accents */}
                            <View style={[styles.corner, { borderColor: theme.text, borderTopWidth: 1, borderLeftWidth: 1, top: -1, left: -1 }]} />
                            <View style={[styles.corner, { borderColor: theme.text, borderTopWidth: 1, borderRightWidth: 1, top: -1, right: -1 }]} />
                            <View style={[styles.corner, { borderColor: theme.text, borderBottomWidth: 1, borderLeftWidth: 1, bottom: -1, left: -1 }]} />
                            <View style={[styles.corner, { borderColor: theme.text, borderBottomWidth: 1, borderRightWidth: 1, bottom: -1, right: -1 }]} />
                        </Animated.View>

                        <Animated.Text
                            entering={FadeInUp.delay(600)}
                            style={[styles.description, { color: theme.subtleText }]}
                        >
                            Architecture for your ambition. Navigate your goals with precision.
                        </Animated.Text>
                    </View>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <Animated.View entering={FadeInUp.delay(800)} style={{ width: '100%' }}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    { backgroundColor: theme.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }
                                ]}
                                onPress={() => router.push('/signup')}
                            >
                                <Text style={[styles.primaryButtonText, { color: theme.primaryText }]}>INITIALIZE SEQ</Text>
                            </Pressable>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(900)} style={{ width: '100%' }}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.secondaryButton,
                                    { borderColor: theme.text, transform: [{ scale: pressed ? 0.98 : 1 }] }
                                ]}
                                onPress={() => router.push('/login')}
                            >
                                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>ACCESS_LOGIN</Text>
                            </Pressable>
                        </Animated.View>

                        <Text style={[styles.copyright, { color: theme.subtleText }]}>
                            EST. 2026 // SECURE CONNECTION
                        </Text>
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
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
    },
    gridLine: {
        position: 'absolute',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    tag: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Courier', // Monospace feel
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 10,
        fontFamily: 'Courier',
        letterSpacing: 1,
    },
    centerStage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
    },
    illustrationContainer: {
        width: width * 0.75,
        height: width * 0.75,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    illustration: {
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    illustrationOverlay: {
        position: 'absolute',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 42,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 6,
        marginTop: -5,
    },
    corner: {
        position: 'absolute',
        width: 10,
        height: 10,
    },
    description: {
        textAlign: 'center',
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        maxWidth: '80%',
        lineHeight: 22,
    },
    footer: {
        width: '100%',
        gap: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 2, // Sharp corners
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 2,
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    copyright: {
        fontSize: 10,
        opacity: 0.5,
        marginTop: 10,
        fontFamily: 'Courier',
    },
});
