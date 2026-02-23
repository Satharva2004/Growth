import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from './AuthContext';
import TransactionService from '@/utils/transactionService';

/**
 * CategoryContext (formerly SatisfactionContext)
 *
 * When AI categorises a transaction as 'Other' or fails to identify it,
 * the app shows a quick in-app modal so the user can pick the right category.
 * This same prompt opens when the user taps the "category-ask" notification body.
 */

const CATEGORIES = [
    { label: '🍔 Food', value: 'Food' },
    { label: '✈️ Travel', value: 'Travel' },
    { label: '🛍 Shopping', value: 'Shopping' },
    { label: '💡 Bills', value: 'Bills' },
    { label: '🎬 Entertainment', value: 'Entertainment' },
    { label: '🏥 Health', value: 'Health' },
    { label: '💸 Transfer', value: 'Transfer' },
    { label: '💰 Income', value: 'Income' },
    { label: '📦 Other', value: 'Other' },
];

interface SatisfactionContextType {
    promptForTransaction: (transactionId: string) => void;
    closePrompt: () => void;
}

const SatisfactionContext = createContext<SatisfactionContextType | undefined>(undefined);

export function SatisfactionProvider({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    const [visible, setVisible] = useState(false);
    const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const promptForTransaction = useCallback((transactionId: string) => {
        setCurrentTransactionId(transactionId);
        setVisible(true);
    }, []);

    const closePrompt = useCallback(() => {
        setVisible(false);
        setTimeout(() => setCurrentTransactionId(null), 300);
    }, []);

    const handleSelectCategory = async (category: string) => {
        if (!token || !currentTransactionId) { closePrompt(); return; }

        try {
            setIsSubmitting(true);
            await TransactionService.partialUpdateTransaction(token, currentTransactionId, { category });
            closePrompt();
        } catch (error) {
            console.error('Failed to set category:', error);
            Alert.alert('Error', 'Failed to save category. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SatisfactionContext.Provider value={{ promptForTransaction, closePrompt }}>
            {children}

            {/* In-app category picker modal */}
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={closePrompt}
            >
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <View style={styles.handle} />
                        <Text style={styles.title}>What was this for?</Text>
                        <Text style={styles.sub}>
                            We couldn't identify the category. Pick one to keep your records tidy.
                        </Text>

                        <View style={styles.grid}>
                            {CATEGORIES.map(cat => (
                                <Pressable
                                    key={cat.value}
                                    style={({ pressed }) => [
                                        styles.catBtn,
                                        pressed && styles.catBtnPressed,
                                    ]}
                                    onPress={() => handleSelectCategory(cat.value)}
                                    disabled={isSubmitting}
                                >
                                    <Text style={styles.catLabel}>{cat.label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            style={styles.skipBtn}
                            onPress={closePrompt}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.skipText}>Skip for now</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SatisfactionContext.Provider>
    );
}

export function useSatisfaction() {
    const context = useContext(SatisfactionContext);
    if (context === undefined) {
        throw new Error('useSatisfaction must be used within a SatisfactionProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
        gap: 16,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
        marginBottom: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111',
        textAlign: 'center',
    },
    sub: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginTop: 4,
    },
    catBtn: {
        backgroundColor: '#f4f4f6',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: '28%',
        alignItems: 'center',
    },
    catBtnPressed: {
        backgroundColor: '#e0e0e6',
        transform: [{ scale: 0.97 }],
    },
    catLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#222',
    },
    skipBtn: {
        alignSelf: 'center',
        paddingVertical: 10,
    },
    skipText: {
        fontSize: 14,
        color: '#999',
    },
});
