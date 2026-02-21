
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
    ActivityIndicator,
    Image,
    Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import SatisfactionService from '@/utils/satisfactionService';

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

    // New Fields State
    const [paymentMethod, setPaymentMethod] = useState('');
    const [referenceId, setReferenceId] = useState('');
    const [source, setSource] = useState('');
    const [smsBody, setSmsBody] = useState('');
    const [imageAddress, setImageAddress] = useState('');
    const [createdAt, setCreatedAt] = useState('');

    // Satisfaction State
    const [rating, setRating] = useState<number | null>(null);
    const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTransactionDetails();
    }, [id, token]);

    const fetchTransactionDetails = async () => {
        if (!token || !id) return;

        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Could not retrieve details.');
            }

            const data = await response.json();
            const txn = data.transaction || data;

            setName(txn.name || '');
            setAmount(String(txn.amount || ''));
            setCategory(txn.category || '');
            setNote(txn.note || '');
            setIsAuto(!!txn.is_auto);

            setPaymentMethod(txn.payment_method || '');
            setReferenceId(txn.reference_id || '');
            setSource(txn.source || '');
            setSmsBody(txn.sms_body || '');
            setImageAddress(txn.image_address || '');
            setCreatedAt(txn.createdAt || '');

            if (txn.transaction_date) {
                setDate(new Date(txn.transaction_date).toISOString().slice(0, 10));
            } else {
                setDate(new Date().toISOString().slice(0, 10));
            }

        } catch (error) {
            setError('Unable to load transaction details.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSatisfaction = async () => {
        if (!token || !id) return;
        try {
            const data = await SatisfactionService.getSatisfaction(token, id as string) as any;
            if (data) {
                setRating(data.rating); // Assuming 'rating' is a number
            }
        } catch (error) {
            console.log('No satisfaction record found or error fetching.');
        }
    };

    useEffect(() => {
        fetchSatisfaction();
    }, [id, token]);

    const handleUpdate = async () => {
        if (!name.trim() || !amount.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Name and Amount required.' });
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

            Toast.show({ type: 'success', text1: 'Updated', text2: 'Changes saved.' });
            setTimeout(() => router.back(), 500);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'System error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRate = async (newRating: number) => {
        if (!token || !id) return;
        try {
            setIsRatingSubmitting(true);
            setRating(newRating); // Optimistic update
            await SatisfactionService.createSatisfaction(token, {
                transactionId: id as string,
                rating: newRating,
                note: '' // Optional note
            });
            Toast.show({ type: 'success', text1: 'Rated', text2: 'Feedback recorded.' });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to rate.' });
        } finally {
            setIsRatingSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Record',
            'Are you sure you want to remove this transaction?',
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
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Record removed.' });
            setTimeout(() => router.back(), 500);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed', text2: 'Could not delete.' });
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

    if (error) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background, padding: 20 }]}>
                <FontAwesome name="exclamation-circle" size={40} color={theme.subtleText} />
                <Text style={{ marginTop: 20, color: theme.text, fontFamily: 'Poppins_500Medium', textAlign: 'center' }}>{error}</Text>
                <Pressable
                    onPress={fetchTransactionDetails}
                    style={[styles.button, { backgroundColor: theme.primary, marginTop: 20, width: '100%' }]}>
                    <Text style={[styles.buttonText, { color: theme.primaryText }]}>Retry</Text>
                </Pressable>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.subtleText, fontFamily: 'Poppins_400Regular' }}>Go Back</Text>
                </Pressable>
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
                {/* Header with Logo and ID */}
                <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
                    {imageAddress ? (
                        <Image source={{ uri: imageAddress }} style={styles.logo} resizeMode="contain" />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: theme.secondarySurface }]}>
                            <FontAwesome name="cube" size={24} color={theme.text} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.recordIdLabel, { color: theme.subtleText }]}>Record ID</Text>
                        <Text style={[styles.recordId, { color: theme.text }]} numberOfLines={1}>{id}</Text>
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Designation</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Value (₹)</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
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
                                            backgroundColor: category === cat ? theme.primary : theme.surface,
                                            ...(!category || category !== cat ? theme.cardShadow : {}),
                                        },
                                    ]}
                                    onPress={() => setCategory(cat)}>
                                    <Text
                                        style={[styles.categoryChipText, { color: category === cat ? theme.primaryText : theme.subtleText }]}>
                                        {cat}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                        <TextInput
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={theme.inputPlaceholder}
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Note</Text>
                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            multiline
                            numberOfLines={3}
                            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
                        />
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Auto Deduct</Text>
                        <Switch value={isAuto} onValueChange={setIsAuto} thumbColor={isAuto ? theme.primary : '#f4f3f4'} trackColor={{ false: theme.inputBackground, true: theme.primary + '50' }} />
                    </View>

                    {/* Metadata Section */}
                    <View style={[styles.card, { backgroundColor: theme.secondarySurface, gap: 10, padding: 16 }]}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: theme.text }}>METADATA</Text>
                        {source ? <Text style={{ fontSize: 12, color: theme.subtleText, fontFamily: 'Poppins_400Regular' }}>Source: {source.toUpperCase()}</Text> : null}
                        {paymentMethod ? <Text style={{ fontSize: 12, color: theme.subtleText, fontFamily: 'Poppins_400Regular' }}>Method: {paymentMethod}</Text> : null}
                        {referenceId ? <Text style={{ fontSize: 12, color: theme.subtleText, fontFamily: 'Poppins_400Regular' }}>Ref ID: {referenceId}</Text> : null}
                        {createdAt ? <Text style={{ fontSize: 12, color: theme.subtleText, fontFamily: 'Poppins_400Regular' }}>Created: {new Date(createdAt).toLocaleString()}</Text> : null}
                    </View>

                    {/* Satisfaction / Rating */}
                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <Text style={[styles.label, { color: theme.text }]}>Was this purchase worth it?</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            {[1, 2, 3, 4, 5].map((r) => (
                                <Pressable
                                    key={r}
                                    onPress={() => handleRate(r)}
                                    style={{
                                        padding: 10,
                                        borderRadius: 12,
                                        backgroundColor: rating === r ? theme.primary : theme.secondarySurface,
                                        width: 50,
                                        alignItems: 'center'
                                    }}>
                                    <Text style={{ fontSize: 20 }}>
                                        {r === 1 ? '😡' : r === 2 ? '😕' : r === 3 ? '😐' : r === 4 ? '🙂' : '😍'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {rating && (
                            <Text style={{ marginTop: 10, textAlign: 'center', color: theme.primary, fontFamily: 'Poppins_600SemiBold' }}>
                                {rating <= 2 ? 'Regret' : rating >= 4 ? 'Great Purchase' : 'Neutral'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }]}
                            onPress={handleUpdate}
                            disabled={isSubmitting}>
                            <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.deleteButton, { opacity: (isDeleting || pressed) ? 0.7 : 1 }]}
                            onPress={handleDelete}
                            disabled={isDeleting}>
                            <Text style={[styles.deleteButtonText, { color: theme.error }]}>
                                {isDeleting ? 'Deleting...' : 'Delete Transaction'}
                            </Text>
                        </Pressable>
                    </View>
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
        marginLeft: -8,
    },
    content: {
        padding: 24,
        gap: 24,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 20,
        padding: 20,
    },
    form: {
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
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    categoryRow: {
        gap: 10,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    categoryChip: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    categoryChipText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    actions: {
        gap: 16,
        marginTop: 10,
    },
    button: {
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    deleteButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordIdLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    recordId: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
});
