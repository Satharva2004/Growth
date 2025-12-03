import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

interface Contribution {
  amount: number;
  note?: string;
  date: string;
}

interface Goal {
  id: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  savedAmount?: number;
  remainingAmount?: number;
  progress?: number;
  targetDate?: string;
  isCompleted?: boolean;
  notes?: string;
  tags?: string[];
  contributions?: Contribution[];
}

export default function GoalDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    if (!token || !id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch goal');

      const data = await response.json();
      const goals = data.goals || [];
      const foundGoal = goals.find((g: Goal) => g.id === id);

      if (foundGoal) {
        setGoal(foundGoal);
        setEditedDescription(foundGoal.description || '');
      } else {
        Alert.alert('Error', 'Goal not found');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load goal details.');
      console.error('Fetch goal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!token || !id || !goal) return;

    try {
      setIsSubmitting(true);
      // Use PATCH for partial update (only description)
      const response = await fetch(`${API_BASE}/goals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: editedDescription.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update goal');

      Alert.alert('Success', 'Goal updated successfully!');
      setIsEditing(false);
      await fetchGoal();
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContribution = async () => {
    if (!contributionAmount.trim()) {
      Alert.alert('Missing amount', 'Please enter a contribution amount.');
      return;
    }

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/goals/${id}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          note: contributionNote.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to add contribution');

      Alert.alert('Success', 'Contribution added!');
      setContributionAmount('');
      setContributionNote('');
      await fetchGoal();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE}/goals/${id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) throw new Error('Failed to delete goal');

            Alert.alert('Success', 'Goal deleted successfully!', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete goal.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>Goal not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = typeof goal.progress === 'number' ? goal.progress : Math.min(((goal.savedAmount || 0) / goal.amount) * 100, 100);
  const current = goal.savedAmount || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.goalName, { color: theme.text }]}>{goal.name}</Text>
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <FontAwesome name="trash" size={20} color="#ff3b30" />
            </Pressable>
          </View>
          {goal.category && (
            <View style={[styles.categoryBadge, { backgroundColor: theme.tint }]}>
              <Text style={styles.categoryText}>{goal.category}</Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.tabIconDefault }]}>
          <View style={styles.amountRow}>
            <Text style={[styles.currentAmount, { color: theme.tint }]}>
              ₹{current.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </Text>
            <Text style={[styles.targetAmount, { color: theme.text }]}>
              / ₹{goal.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.tabIconDefault }]}>
            <View
              style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.tint }]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.text }]}>
            {progress.toFixed(0)}% complete
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.tabIconDefault }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
            <Pressable onPress={() => setIsEditing(!isEditing)}>
              <FontAwesome name={isEditing ? 'times' : 'edit'} size={18} color={theme.tint} />
            </Pressable>
          </View>
          {isEditing ? (
            <>
              <TextInput
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Add a description..."
                placeholderTextColor="#8c8c8c"
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: theme.tabIconDefault, color: theme.text },
                ]}
              />
              <Pressable
                style={[styles.button, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={handleUpdateDescription}
                disabled={isSubmitting}>
                <Text style={styles.buttonText}>
                  {isSubmitting ? 'Saving...' : 'Save Description'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {goal.description || 'No description'}
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.tabIconDefault }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Contribution</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Amount (₹)</Text>
            <TextInput
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholder="250"
              placeholderTextColor="#8c8c8c"
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Note (optional)</Text>
            <TextInput
              value={contributionNote}
              onChangeText={setContributionNote}
              placeholder="e.g., Booked flights"
              placeholderTextColor="#8c8c8c"
              style={[styles.input, { borderColor: theme.tabIconDefault, color: theme.text }]}
            />
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleAddContribution}
            disabled={isSubmitting}>
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Adding...' : 'Add Contribution'}
            </Text>
          </Pressable>
        </View>

        {goal.contributions && goal.contributions.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.tabIconDefault }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Contribution History</Text>
            {goal.contributions.map((contribution, index) => (
              <View
                key={index}
                style={[
                  styles.contributionItem,
                  { borderBottomColor: theme.tabIconDefault },
                  index === goal.contributions!.length - 1 && styles.lastContribution,
                ]}>
                <View style={styles.contributionRow}>
                  <Text style={[styles.contributionAmount, { color: theme.tint }]}>
                    +${contribution.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.contributionDate, { color: theme.text }]}>
                    {new Date(contribution.date).toLocaleDateString()}
                  </Text>
                </View>
                {contribution.note && (
                  <Text style={[styles.contributionNote, { color: theme.text }]}>
                    {contribution.note}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currentAmount: {
    fontSize: 36,
    fontWeight: '700',
  },
  targetAmount: {
    fontSize: 20,
    marginLeft: 8,
    opacity: 0.6,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contributionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastContribution: {
    borderBottomWidth: 0,
  },
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contributionAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  contributionDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  contributionNote: {
    fontSize: 14,
    opacity: 0.8,
  },
  errorText: {
    fontSize: 16,
  },
});
