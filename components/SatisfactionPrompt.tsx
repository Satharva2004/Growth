import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');

interface SatisfactionPromptProps {
    visible: boolean;
    onSelectOption: (rating: number) => void;
    onClose: () => void;
    isSubmitting?: boolean;
}

export default function SatisfactionPrompt({
    visible,
    onSelectOption,
    onClose,
    isSubmitting = false,
}: SatisfactionPromptProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [scaleAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                damping: 15,
                stiffness: 150,
            }).start();
        } else {
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.background,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.content}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.tint + '20' }]}>
                            <Ionicons name="cart-outline" size={32} color={theme.tint} />
                        </View>

                        <Text style={[styles.title, { color: theme.text }]}>
                            Purchase detected!
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.text }]}>
                            Was this purchase worth it?
                        </Text>

                        {isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.tint} />
                            </View>
                        ) : (
                            <View style={styles.optionsContainer}>
                                <Pressable
                                    style={[styles.optionButton, { backgroundColor: '#FF6B6B' }]}
                                    onPress={() => onSelectOption(1)}
                                    testID="option-no"
                                >
                                    <Ionicons name="thumbs-down" size={24} color="#FFF" />
                                    <Text style={styles.optionText}>No</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.optionButton, { backgroundColor: '#FFD93D' }]}
                                    onPress={() => onSelectOption(3)}
                                    testID="option-maybe"
                                >
                                    <Ionicons name="help" size={24} color="#333" />
                                    <Text style={[styles.optionText, { color: '#333' }]}>Maybe</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.optionButton, { backgroundColor: '#4D96FF' }]}
                                    onPress={() => onSelectOption(5)}
                                    testID="option-yes"
                                >
                                    <Ionicons name="thumbs-up" size={24} color="#FFF" />
                                    <Text style={styles.optionText}>Yes</Text>
                                </Pressable>
                            </View>
                        )}

                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <Text style={[styles.closeText, { color: theme.tabIconDefault }]}>
                                Ask me later
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        opacity: 0.8,
        marginBottom: 24,
        textAlign: 'center',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 2,
    },
    optionText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#FFF',
    },
    loadingContainer: {
        height: 80,
        justifyContent: 'center',
    },
    closeButton: {
        marginTop: 20,
        padding: 8,
    },
    closeText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
});
