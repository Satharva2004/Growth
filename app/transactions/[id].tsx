
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
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Savings', 'Other'];

export default function TransactionDetailScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark']; // Force wireframe
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
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transaction details');
            }

            const data = await response.json();
            const txn = data.transaction || data;

            setName(txn.name || '');
            setAmount(String(txn.amount || ''));
            setCategory(txn.category || '');
            setNote(txn.note || '');
            setIsAuto(!!txn.is_auto);

            if (txn.transaction_date) {
                setDate(new Date(txn.transaction_date).toISOString().slice(0, 10));
            } else {
                setDate(new Date().toISOString().slice(0, 10));
            }

        } catch (error) {
            Toast.show({ type: 'error', text1: 'FETCH_FAIL', text2: 'Could not retrieve entry.' });
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim() || !amount.trim()) {
            Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Data incomplete.' });
            return;
        }

        try {
            setIsSubmitting(true);
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

            Toast.show({ type: 'success', text1: 'LEDGER_UPDATED', text2: 'Parameters modified.' });
            setTimeout(() => router.back(), 500);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'UPDATE_FAIL', text2: 'System error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'DELETE_ENTRY',
            'Confirm removal of this ledger record?',
            [
                { text: 'ABORT', style: 'cancel' },
                {
                    text: 'CONFIRM',
                    style: 'destructive',
                    onPress: performDelete
                }
            ]
        );
    };

    const performDelete = async () => {
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            Toast.show({ type: 'success', text1: 'ENTRY_REMOVED', text2: 'Record deleted.' });
            setTimeout(() => router.back(), 500);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'DELETE_FAIL', text2: 'System error.' });
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={16} color={theme.text} />
                </Pressable>
                <View style={[styles.tag, { borderColor: theme.tint }]}>
                    <Text style={[styles.tagText, { color: theme.tint }]}>MODIFY_LEDGER</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.subtleText }]}>DESIGNATION</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.subtleText }]}>VALUE (₹)</Text>
                    <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.subtleText }]}>CATEGORY_TAG</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                        {CATEGORIES.map((cat) => (
                            <Pressable
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    {
                                        backgroundColor: category === cat ? theme.primary : 'transparent',
                                        borderColor: category === cat ? theme.tint : theme.text,
                                    },
                                ]}
                                onPress={() => setCategory(cat)}>
                                <Text
                                    style={[styles.categoryChipText, { color: category === cat ? theme.primaryText : theme.text }]}>
                                    {cat.toUpperCase()}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.subtleText }]}>DATE_STAMP (YYYY-MM-DD)</Text>
                    <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.subtleText}
                        style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: theme.subtleText }]}>ANNOTATION</Text>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        style={[styles.input, styles.textArea, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
                    />
                </View>

                <View style={[styles.switchRow, { borderColor: theme.text }]}>
                    <Text style={[styles.label, { color: theme.text }]}>AUTO_DEDUCT_CYCLE</Text>
                    <Switch value={isAuto} onValueChange={setIsAuto} thumbColor={theme.primary} trackColor={{ false: theme.subtleText, true: theme.text }} />
                </View>

                <View style={styles.actions}>
                    <Pressable
                        style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }]}
                        onPress={handleUpdate}
                        disabled={isSubmitting}>
                        <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'SAVING...' : 'COMMIT_CHANGES'}</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.deleteButton, { borderColor: theme.text, opacity: (isDeleting || pressed) ? 0.7 : 1 }]}
                        onPress={handleDelete}
                        disabled={isDeleting}>
                        <Text style={[styles.deleteButtonText, { color: theme.text }]}>
                            {isDeleting ? 'DELETING...' : 'DELETE_ENTRY'}
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
        gap: 8,
    },
    tag: {
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
    },
    backButton: {
        padding: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    content: {
        padding: 24,
        gap: 24,
    },
    fieldGroup: {
        gap: 8,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Courier',
        letterSpacing: 1,
    },
    input: {
        borderWidth: 1,
        borderRadius: 2,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: 'Courier',
        fontSize: 16,
    },
    textArea: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    categoryRow: {
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        borderWidth: 1,
        borderRadius: 2,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    categoryChipText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 2,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    actions: {
        gap: 12,
        marginTop: 20,
    },
    button: {
        borderRadius: 2,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    deleteButton: {
        borderRadius: 2,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    deleteButtonText: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
});
