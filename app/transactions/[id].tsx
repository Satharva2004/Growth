import { useState, useEffect } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Switch,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Savings', 'Other'];

export default function TransactionDetailScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { token } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState('');
    const [isAuto, setIsAuto] = useState(false);

    useEffect(() => {
        fetchTransactionDetails();
    }, [id, token]);

    const fetchTransactionDetails = async () => {
        if (!token || !id) return;

        try {
            setIsLoading(true);
            // NOTE: Using 'transcation' typo as seen in create.tsx to match backend
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transaction details');
            }

            const data = await response.json();
            const txn = data.transaction || data; // Handle potential wrapper

            setName(txn.name || '');
            setAmount(String(txn.amount || ''));
            setCategory(txn.category || '');
            setNote(txn.note || '');
            setIsAuto(!!txn.is_auto);

            // Format date for display
            if (txn.transaction_date) {
                setDate(new Date(txn.transaction_date).toISOString().slice(0, 10));
            } else {
                setDate(new Date().toISOString().slice(0, 10));
            }

        } catch (error) {
            Alert.alert('Error', 'Could not load transaction details.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim() || !amount.trim()) {
            Alert.alert('Missing info', 'Name and amount are required.');
            return;
        }

        try {
            setIsSubmitting(true);
            // PUT /:id
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    amount: parseFloat(amount),
                    category: category || undefined,
                    note: note.trim() || undefined,
                    is_auto: isAuto,
                    transaction_date: new Date(date).toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update transaction');
            }

            Alert.alert('Updated', 'Transaction updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to update transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: performDelete
                }
            ]
        );
    };

    const performDelete = async () => {
        try {
            setIsDeleting(true);
            // DELETE /:id
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete transaction.');
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Transaction</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                    <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                        {CATEGORIES.map((cat) => (
                            <Pressable
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    {
                                        backgroundColor: category === cat ? theme.tint : 'transparent',
                                        borderColor: category === cat ? theme.tint : theme.cardBorder,
                                    },
                                ]}
                                onPress={() => setCategory(cat)}>
                                <Text
                                    style={[styles.categoryChipText, { color: category === cat ? '#fff' : theme.text }]}>
                                    {cat}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.inputPlaceholder}
                        style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Note</Text>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        style={[styles.input, styles.textArea, { borderColor: theme.tabIconDefault, color: theme.text }]}
                    />
                </View>

                <View style={styles.switchRow}>
                    <Text style={[styles.label, { color: theme.text }]}>Recurring/auto deduction?</Text>
                    <Switch value={isAuto} onValueChange={setIsAuto} thumbColor={theme.tint} />
                </View>

                <View style={styles.actions}>
                    <Pressable
                        style={[styles.button, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]}
                        onPress={handleUpdate}
                        disabled={isSubmitting}>
                        <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.deleteButton, { borderColor: '#ff4444' }]}
                        onPress={handleDelete}
                        disabled={isDeleting}>
                        <Text style={[styles.deleteButtonText, { color: '#ff4444' }]}>
                            {isDeleting ? 'Deleting...' : 'Delete Transaction'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
    },
    backButton: {
        padding: 8,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    fieldGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: 'Poppins_500Medium',
        fontSize: 15,
    },
    textArea: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    categoryRow: {
        gap: 10,
        paddingVertical: 4,
    },
    categoryChip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    categoryChipText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    actions: {
        gap: 12,
        marginTop: 20,
    },
    button: {
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    deleteButton: {
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
});
