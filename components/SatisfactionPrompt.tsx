
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
    const theme = Colors[colorScheme ?? 'dark']; // Force wireframe
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
                            borderColor: theme.text,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.content}>
                        <View style={[styles.headerBox, { borderColor: theme.text }]}>
                            <Text style={[styles.title, { color: theme.text }]}>
                                TRANSACTION_DETECTED
                            </Text>
                        </View>

                        <View style={styles.promptBox}>
                            <Text style={[styles.subtitle, { color: theme.text }]}>
                                ASSESS_VALUE_METRIC:
                            </Text>
                            <Text style={[styles.question, { color: theme.subtleText }]}>
                                WAS THE PURCHASE WORTH IT?
                            </Text>
                        </View>

                        {isSubmitting ? (
                            <View style={[styles.loadingContainer, { borderColor: theme.text }]}>
                                <ActivityIndicator size="small" color={theme.text} />
                                <Text style={[styles.loadingText, { color: theme.text }]}>PROCESSING...</Text>
                            </View>
                        ) : (
                            <View style={styles.optionsContainer}>
                                <Pressable
                                    style={[styles.optionButton, { borderColor: theme.text }]}
                                    onPress={() => onSelectOption(1)}
                                    testID="option-no"
                                >
                                    <View style={[styles.iconBox, { borderColor: theme.text }]}>
                                        <Ionicons name="close" size={16} color={theme.text} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.text }]}>NEGATIVE</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.optionButton, { borderColor: theme.text }]}
                                    onPress={() => onSelectOption(3)}
                                    testID="option-maybe"
                                >
                                    <View style={[styles.iconBox, { borderColor: theme.text }]}>
                                        <Ionicons name="remove" size={16} color={theme.text} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.text }]}>NEUTRAL</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.optionButton, { borderColor: theme.text }]}
                                    onPress={() => onSelectOption(5)}
                                    testID="option-yes"
                                >
                                    <View style={[styles.iconBox, { borderColor: theme.text }]}>
                                        <Ionicons name="checkmark" size={16} color={theme.text} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.text }]}>POSITIVE</Text>
                                </Pressable>
                            </View>
                        )}

                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <Text style={[styles.closeText, { color: theme.subtleText }]}>
                                [ DEFER_ASSESSMENT ]
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
        backgroundColor: 'rgba(0,0,0,0.8)', // Darker overlay
    },
    container: {
        width: width * 0.9,
        borderWidth: 1,
        borderRadius: 2, // Sharp
        overflow: 'hidden',
    },
    content: {
        padding: 24,
        alignItems: 'center',
        gap: 20,
    },
    headerBox: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    promptBox: {
        alignItems: 'center',
        gap: 4,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    question: {
        fontSize: 10,
        fontFamily: 'Courier',
        textTransform: 'uppercase',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 8,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    loadingContainer: {
        height: 80,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        gap: 8,
    },
    loadingText: {
        fontFamily: 'Courier',
        fontSize: 10,
    },
    closeButton: {
        marginTop: 8,
        padding: 8,
    },
    closeText: {
        fontSize: 10,
        fontFamily: 'Courier',
    },
});
