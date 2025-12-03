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

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Travel', 'Education', 'Health', 'Savings', 'Shopping', 'Other'];

export default function CreateGoalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !amount.trim()) {
      Alert.alert('Missing fields', 'Please enter goal name and target amount.');
      return;
    }

    const targetAmount = parseFloat(amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number.');
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
          (result && (result.message || result.error)) || 'Failed to create goal.';
        throw new Error(message);
      }

      Alert.alert('Success', 'Goal created successfully!', [
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Create New Goal</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Goal Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Travel Fund"
            placeholderTextColor="#8c8c8c"
            style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Target Amount (₹) *</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.currencySymbol, { color: theme.text }]}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={(text) => {
                // Allow only numbers and decimal point
                const formatted = text.replace(/[^0-9.]/g, '');
                // Handle multiple decimal points
                if ((formatted.match(/\./g) || []).length > 1) return;
                setAmount(formatted);
              }}
              placeholder="2,000.00"
              placeholderTextColor="#8c8c8c"
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { 
                  borderColor: theme.tabIconDefault, 
                  color: theme.text,
                  flex: 1,
                  paddingLeft: 30,
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor="#8c8c8c"
            multiline
            numberOfLines={3}
            style={[
              styles.input,
              styles.textArea,
              { borderColor: theme.tabIconDefault, color: theme.text },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat ? theme.tint : 'transparent',
                    borderColor: category === cat ? theme.tint : theme.tabIconDefault,
                  },
                ]}
                onPress={() => setCategory(cat)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: category === cat ? '#fff' : theme.text },
                  ]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 },
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Creating...' : 'Create Goal'}</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    fontSize: 16,
    fontWeight: '500',
    zIndex: 1,
  },
});
