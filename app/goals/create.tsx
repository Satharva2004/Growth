
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Travel', 'Education', 'Health', 'Savings', 'Shopping', 'Other'];

export default function CreateGoalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark']; // Force wireframe
  const router = useRouter();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !amount.trim()) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Name and Target Value required.' });
      return;
    }

    const targetAmount = parseFloat(amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Positive numeric value required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          amount: targetAmount,
          description: description.trim() || undefined,
          category: category || undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (result && (result.message || result.error)) || 'Failed to initialize objective.';
        throw new Error(message);
      }

      Toast.show({ type: 'success', text1: 'OBJECTIVE_INIT', text2: 'Goal sequence started.' });
      setTimeout(() => router.back(), 500);

    } catch (error) {
      const description = error instanceof Error ? error.message : 'System error.';
      Toast.show({ type: 'error', text1: 'INIT_FAIL', text2: description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.tag, { borderColor: theme.tint }]}>
            <Text style={[styles.tagText, { color: theme.tint }]}>NEW_OBJECTIVE</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>INITIALIZE_GOAL</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>DESIGNATION</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="E.G. ORBITAL_STATION"
            placeholderTextColor={theme.subtleText}
            style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>TARGET_VALUE (₹)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.currencySymbol, { color: theme.text }]}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={(text) => {
                const formatted = text.replace(/[^0-9.]/g, '');
                if ((formatted.match(/\./g) || []).length > 1) return;
                setAmount(formatted);
              }}
              placeholder="0.00"
              placeholderTextColor={theme.subtleText}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                {
                  borderColor: theme.text,
                  color: theme.text,
                  backgroundColor: theme.background,
                  flex: 1,
                  paddingLeft: 30,
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>PARAMETERS_DESC</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="OPTIONAL_DATA..."
            placeholderTextColor={theme.subtleText}
            multiline
            numberOfLines={3}
            style={[
              styles.input,
              styles.textArea,
              { borderColor: theme.text, color: theme.text, backgroundColor: theme.background },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.subtleText }]}>CATEGORY_TAG</Text>
          <View style={styles.categoryContainer}>
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
                  style={[
                    styles.categoryChipText,
                    { color: category === cat ? theme.primaryText : theme.text },
                  ]}>
                  {cat.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 },
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}>
          <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'INITIALIZING...' : 'EXECUTE_INIT'}</Text>
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
    borderRadius: 2, // Sharp
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Courier',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2, // Sharp
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 2, // Sharp
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    fontSize: 16,
    fontFamily: 'Courier',
    zIndex: 1,
  },
});
