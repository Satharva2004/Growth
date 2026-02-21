
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Income', 'Savings', 'Other'];
const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Net Banking', 'Wallet'];

export default function CreateTransactionScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Name', text2: 'Please enter a transaction name.' });
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/transcation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          category: category || 'Other',
          note: note.trim() || undefined,
          transaction_date: new Date(date).toISOString(),
          payment_method: paymentMethod || undefined,
          is_auto: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      Toast.show({ type: 'success', text1: 'Transaction Added', text2: 'Record saved successfully.' });
      setTimeout(() => router.back(), 500);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save the transaction.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Add Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Transaction Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Swiggy, Electricity Bill"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Amount (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: category === cat ? theme.primary : theme.surface, ...theme.cardShadow },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, { color: category === cat ? theme.primaryText : theme.subtleText }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Payment Method */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method}
                style={[
                  styles.chip,
                  { backgroundColor: paymentMethod === method ? theme.primary : theme.surface, ...theme.cardShadow },
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[styles.chipText, { color: paymentMethod === method ? theme.primaryText : theme.subtleText }]}>
                  {method}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Date */}
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

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            placeholder="Add a short note..."
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
          />
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: theme.primary, opacity: isSubmitting || pressed ? 0.7 : 1 },
          ]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text style={[styles.submitText, { color: theme.primaryText }]}>
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  submitButton: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
