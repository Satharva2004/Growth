import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Savings', 'Other'];

export default function CreateTransactionScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isAuto, setIsAuto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !amount.trim()) {
      Alert.alert('Missing info', 'Please provide a name and amount for the transaction.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      Alert.alert('Invalid amount', 'Enter a valid number for amount.');
      return;
    }

    if (!token) {
      Alert.alert('Session expired', 'Please sign in again to create a transaction.');
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
          amount: parsedAmount,
          category: category || undefined,
          note: note.trim() || undefined,
          is_auto: isAuto,
          transaction_date: new Date(date).toISOString(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (result && (result.message || result.error)) || 'Failed to create transaction.';
        throw new Error(message);
      }

      Alert.alert('Success', 'Transaction created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unexpected error.';
      Alert.alert('Error', description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Create Transaction</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Weekly groceries"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Amount *</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => {
              const formatted = text.replace(/[^0-9.]/g, '');
              if ((formatted.match(/\./g) || []).length > 1) return;
              setAmount(formatted);
            }}
            keyboardType="decimal-pad"
            placeholder="150.00"
            placeholderTextColor={theme.inputPlaceholder}
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
          <Text style={[styles.label, { color: theme.text }]}>Date</Text>
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
            placeholder="Optional note"
            placeholderTextColor={theme.inputPlaceholder}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea, { borderColor: theme.tabIconDefault, color: theme.text }]}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.text }]}>Recurring/auto deduction?</Text>
          <Switch value={isAuto} onValueChange={setIsAuto} thumbColor={theme.tint} />
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={onSubmit}
          disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Creating...' : 'Save transaction'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
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
});
