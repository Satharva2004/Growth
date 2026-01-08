
import { useState } from 'react';
import {
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

import Toast from 'react-native-toast-message';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useSatisfaction } from '@/contexts/SatisfactionContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Savings', 'Other'];

export default function CreateTransactionScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark']; // Force wireframe
  const router = useRouter();
  const { token } = useAuth();
  const { promptForTransaction } = useSatisfaction();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isAuto, setIsAuto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !amount.trim()) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Name and Value required.' });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Numeric value required.' });
      return;
    }

    if (!token) {
      Toast.show({ type: 'error', text1: 'AUTH_ERR', text2: 'Session expired.' });
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

      const newTransactionId = result.transaction?.id || result.transaction?._id || result._id || result.data?._id || result.id;

      Toast.show({
        type: 'success',
        text1: 'ENTRY_ADDED',
        text2: 'Ledger updated successfully.',
      });

      if (newTransactionId) {
        promptForTransaction(newTransactionId);
      }

      router.back();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'System error.';
      Toast.show({ type: 'error', text1: 'ENTRY_SUBMIT_FAIL', text2: description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.tag, { borderColor: theme.tint }]}>
            <Text style={[styles.tagText, { color: theme.tint }]}>NEW_ENTRY</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>LEDGER_INPUT</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>DESIGNATION</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="E.G. SUPPLIES"
            placeholderTextColor={theme.subtleText}
            style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>VALUE (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => {
              const formatted = text.replace(/[^0-9.]/g, '');
              if ((formatted.match(/\./g) || []).length > 1) return;
              setAmount(formatted);
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.subtleText}
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
          <Text style={[styles.label, { color: theme.subtleText }]}>DATE_STAMP</Text>
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
            placeholder="OPTIONAL..."
            placeholderTextColor={theme.subtleText}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: theme.text }]}>
          <Text style={[styles.label, { color: theme.text }]}>AUTO_DEDUCT_CYCLE</Text>
          <Switch value={isAuto} onValueChange={setIsAuto} thumbColor={theme.primary} trackColor={{ false: theme.subtleText, true: theme.text }} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}>
          <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'PROCESSING...' : 'EXECUTE_ENTRY'}</Text>
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
    padding: 24,
    gap: 24,
  },
  header: {
    marginBottom: 12,
    gap: 8,
  },
  tag: {
    alignSelf: 'flex-start',
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
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
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
  button: {
    borderRadius: 2,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
