import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import SatisfactionService from '@/utils/satisfactionService';
import SatisfactionPrompt from '@/components/SatisfactionPrompt';
import { useAuth } from './AuthContext';

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
        // Determine if we should clear currentTransactionId immediately or after animation
        // For now, clear it after a short delay or immediately if needed.
        setTimeout(() => setCurrentTransactionId(null), 300);
    }, []);

    const handleSelectOption = async (rating: number) => {
        if (!token || !currentTransactionId) return;

        try {
            setIsSubmitting(true);

            // Determine note based on rating for better default data
            let note = '';
            if (rating === 5) note = 'Yes, worth it';
            else if (rating === 3) note = 'Maybe';
            else if (rating === 1) note = 'No, not worth it';

            await SatisfactionService.createSatisfaction(token, {
                transactionId: currentTransactionId,
                rating,
                note
            });

            // Close modal on success
            closePrompt();
        } catch (error) {
            console.error('Failed to submit satisfaction:', error);
            Alert.alert('Error', 'Failed to save your feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SatisfactionContext.Provider value={{ promptForTransaction, closePrompt }}>
            {children}
            <SatisfactionPrompt
                visible={visible}
                onSelectOption={handleSelectOption}
                onClose={closePrompt}
                isSubmitting={isSubmitting}
            />
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
