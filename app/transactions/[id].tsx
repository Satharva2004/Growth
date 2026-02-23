
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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';

import Colors, { Fonts as F } from '@/constants/Colors';
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

    // New Fields State
    const [paymentMethod, setPaymentMethod] = useState('');
    const [referenceId, setReferenceId] = useState('');
    const [source, setSource] = useState('');
    const [imageAddress, setImageAddress] = useState('');
    const [createdAt, setCreatedAt] = useState('');

    // Satisfaction State
    const [rating, setRating] = useState<number | null>(null);

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

            if (!response.ok) throw new Error('Could not retrieve details.');

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
        // No-op: satisfaction removed in favour of category-ask flow
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

            if (!response.ok) throw new Error('Failed to update transaction');

            Toast.show({ type: 'success', text1: 'Updated', text2: 'Changes saved.' });
            setTimeout(() => router.back(), 500);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'System error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRate = async (newRating: number) => {
        // Store the emoji rating as a local note on the transaction
        if (!token || !id) return;
        try {
            setRating(newRating);
            const ratingLabel = newRating === 5 ? 'Worth it 😍' : newRating === 4 ? 'Good 🙂' : newRating === 3 ? 'Ok 😐' : newRating === 2 ? 'Meh 😕' : 'Regret 😡';
            await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ note: `${ratingLabel} — ${note}`.trim() }),
            });
            Toast.show({ type: 'success', text1: 'Rated', text2: 'Feedback saved.' });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save rating.' });
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Record',
            'Are you sure you want to remove this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]
        );
    };

    const performDelete = async () => {
        try {
            setIsDeleting(true);
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to delete');
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
                <Text style={{ marginTop: 20, color: theme.text, fontFamily: F.medium, textAlign: 'center' }}>{error}</Text>
                <Pressable
                    onPress={fetchTransactionDetails}
                    style={[styles.button, { backgroundColor: theme.primary, marginTop: 20, width: '100%' }]}>
                    <Text style={[styles.buttonText, { color: theme.primaryText }]}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color={theme.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Record Details</Text>
                <Pressable onPress={handleDelete} style={{ padding: 8 }}>
                    <FontAwesome name="trash-o" size={20} color={theme.error} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Visual Header */}
                <View style={[styles.visualCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <View style={[styles.logoCircle, { backgroundColor: theme.accent }]}>
                        {imageAddress ? (
                            <Image source={{ uri: imageAddress }} style={styles.logo} resizeMode="cover" />
                        ) : (
                            <Text style={[styles.logoIconText, { color: theme.accentText }]}>{name.charAt(0).toUpperCase()}</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.visualName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.visualId, { color: theme.subtleText }]}>ID: {String(id).slice(-8).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Main Form */}
                <View style={styles.formSection}>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: theme.subtleText }]}>TRANSACTION NAME</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, ...theme.cardShadow }]}
                            placeholder="Enter name"
                            placeholderTextColor={theme.inputPlaceholder}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: theme.subtleText }]}>AMOUNT (₹)</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, ...theme.cardShadow, fontSize: 24, fontWeight: '700' }]}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: theme.subtleText }]}>CATEGORY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {CATEGORIES.map((cat) => (
                                <Pressable
                                    key={cat}
                                    style={[
                                        styles.catChip,
                                        {
                                            backgroundColor: category === cat ? theme.primary : theme.surface,
                                            borderWidth: category === cat ? 0 : 1,
                                            borderColor: theme.divider,
                                        }
                                    ]}
                                    onPress={() => setCategory(cat)}>
                                    <Text style={[styles.catChipText, { color: category === cat ? theme.primaryText : theme.text }]}>{cat}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: theme.subtleText }]}>TRANSACTION DATE</Text>
                        <TextInput
                            value={date}
                            onChangeText={setDate}
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, ...theme.cardShadow }]}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: theme.subtleText }]}>PRIVATE NOTE</Text>
                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            multiline
                            numberOfLines={3}
                            style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, ...theme.cardShadow }]}
                            placeholder="Add memo..."
                            placeholderTextColor={theme.inputPlaceholder}
                        />
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={[styles.switchLabel, { color: theme.text }]}>Auto-detected from SMS</Text>
                        <Switch
                            value={isAuto}
                            onValueChange={setIsAuto}
                            trackColor={{ false: theme.divider, true: theme.accent }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Feedback */}
                <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <Text style={[styles.fieldLabel, { color: theme.subtleText, marginBottom: 16 }]}>PURCHASE SATISFACTION</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((r) => (
                            <Pressable
                                key={r}
                                onPress={() => handleRate(r)}
                                style={[styles.ratingBtn, { backgroundColor: rating === r ? theme.accent : theme.background }]}>
                                <Text style={{ fontSize: 20 }}>
                                    {r === 1 ? '😡' : r === 2 ? '😕' : r === 3 ? '😐' : r === 4 ? '🙂' : '😍'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Metadata */}
                <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.divider, borderWidth: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.subtleText, marginBottom: 12 }]}>PAYMENT INFO</Text>
                    <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaKey}>Source</Text>
                            <Text style={[styles.metaVal, { color: theme.text }]}>{source || 'Manual'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaKey}>Method</Text>
                            <Text style={[styles.metaVal, { color: theme.text }]}>{paymentMethod || '—'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaKey}>Created</Text>
                            <Text style={[styles.metaVal, { color: theme.text }]}>{createdAt ? new Date(createdAt).toLocaleDateString() : '—'}</Text>
                        </View>
                    </View>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.9 : 1 }]}
                    onPress={handleUpdate}
                    disabled={isSubmitting}>
                    <Text style={[styles.saveBtnText, { color: theme.primaryText }]}>{isSubmitting ? 'Updating...' : 'Confirm Changes'}</Text>
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12
    },
    headerTitle: { fontSize: 17, fontFamily: F.bold },
    backButton: { padding: 8 },
    content: { padding: 20, gap: 20 },
    card: { borderRadius: 24, padding: 20 },
    visualCard: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        padding: 24, borderRadius: 28,
    },
    logoCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    logo: { width: '100%', height: '100%' },
    logoIconText: { fontSize: 24, fontFamily: F.bold },
    visualName: { fontSize: 22, fontFamily: F.bold, letterSpacing: -0.5 },
    visualId: { fontSize: 12, fontFamily: F.medium, marginTop: 2 },
    formSection: { gap: 16 },
    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 10, fontFamily: F.bold, letterSpacing: 1, textTransform: 'uppercase' },
    input: {
        borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16,
        fontSize: 16, fontFamily: F.medium
    },
    textArea: {
        borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16,
        fontSize: 15, fontFamily: F.regular, minHeight: 90, textAlignVertical: 'top'
    },
    categoryScroll: { gap: 10, paddingVertical: 4 },
    catChip: { borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    catChipText: { fontSize: 13, fontFamily: F.semiBold },
    switchLabel: { fontSize: 14, fontFamily: F.medium },
    ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
    ratingBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    metaGrid: { gap: 12 },
    metaItem: { flexDirection: 'row', justifyContent: 'space-between' },
    metaKey: { fontSize: 13, fontFamily: F.regular, color: '#888' },
    metaVal: { fontSize: 13, fontFamily: F.medium },
    saveBtn: { borderRadius: 30, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
    saveBtnText: { fontSize: 16, fontFamily: F.bold },
    button: { borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
    buttonText: { fontSize: 16, fontFamily: F.bold },
});
