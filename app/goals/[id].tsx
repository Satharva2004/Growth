
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
import Toast from 'react-native-toast-message';

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
  const theme = Colors[colorScheme ?? 'dark']; // Force wireframe
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
        Toast.show({ type: 'error', text1: 'ERROR_404', text2: 'Goal node not found.' });
        router.back();
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'FETCH_ERR', text2: 'Data link failed.' });
      console.error('Fetch goal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!token || !id || !goal) return;

    try {
      setIsSubmitting(true);
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

      Toast.show({ type: 'success', text1: 'UPDATE_SUCCESS', text2: 'Parameters updated.' });
      setIsEditing(false);
      await fetchGoal();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'UPDATE_ERR', text2: 'Save failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContribution = async () => {
    if (!contributionAmount.trim()) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Amount required.' });
      return;
    }

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'INPUT_ERR', text2: 'Positive value required.' });
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

      Toast.show({ type: 'success', text1: 'CONTRIBUTION_REC', text2: 'Value added to stack.' });
      setContributionAmount('');
      setContributionNote('');
      await fetchGoal();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'TRANSACTION_FAIL', text2: 'Contribution rejected.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('TERMINATE_GOAL', 'Confirm deletion of objective node?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'CONFIRM DELETE',
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

            Toast.show({ type: 'success', text1: 'TERMINATED', text2: 'Objective removed.' });
            setTimeout(() => router.back(), 500);
          } catch (error) {
            Toast.show({ type: 'error', text1: 'DELETE_FAIL', text2: 'Could not remove node.' });
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>NODE_NOT_FOUND</Text>
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
          <View style={[styles.tag, { borderColor: theme.tint }]}>
            <Text style={[styles.tagText, { color: theme.tint }]}>OBJECTIVE_DETAIL</Text>
          </View>
          <View style={styles.headerTop}>
            <Text style={[styles.goalName, { color: theme.text }]}>{goal.name.toUpperCase()}</Text>
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <FontAwesome name="trash" size={16} color={theme.text} />
            </Pressable>
          </View>
          {goal.category && (
            <View style={[styles.categoryBadge, { borderColor: theme.text }]}>
              <Text style={[styles.categoryText, { color: theme.text }]}>{goal.category.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { borderColor: theme.text, backgroundColor: theme.background }]}>
          <View style={styles.amountRow}>
            <Text style={[styles.currentAmount, { color: theme.text }]}>
              ₹{current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.targetAmount, { color: theme.subtleText }]}>
              / ₹{goal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { borderColor: theme.text }]}>
            <View
              style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.text }]}>
            COMPLETION: {progress.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.card, { borderColor: theme.text, backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>PARAMETERS_DESC</Text>
            <Pressable onPress={() => setIsEditing(!isEditing)}>
              <FontAwesome name={isEditing ? 'times' : 'edit'} size={14} color={theme.text} />
            </Pressable>
          </View>
          {isEditing ? (
            <>
              <TextInput
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="EDIT_PARAMETERS..."
                placeholderTextColor={theme.subtleText}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: theme.text, color: theme.text, backgroundColor: theme.background },
                ]}
              />
              <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }]}
                onPress={handleUpdateDescription}
                disabled={isSubmitting}>
                <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                  {isSubmitting ? 'SAVING...' : 'UPDATE_DESC'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {goal.description || 'NO_DATA'}
            </Text>
          )}
        </View>

        <View style={[styles.card, { borderColor: theme.text, backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>INJECT_FUNDS</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.subtleText }]}>VALUE (₹)</Text>
            <TextInput
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholder="0.00"
              placeholderTextColor={theme.subtleText}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.subtleText }]}>NOTE_REF</Text>
            <TextInput
              value={contributionNote}
              onChangeText={setContributionNote}
              placeholder="OPTIONAL..."
              placeholderTextColor={theme.subtleText}
              style={[styles.input, { borderColor: theme.text, color: theme.text, backgroundColor: theme.background }]}
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }]}
            onPress={handleAddContribution}
            disabled={isSubmitting}>
            <Text style={[styles.buttonText, { color: theme.primaryText }]}>
              {isSubmitting ? 'PROCESSING...' : 'EXECUTE_TRANSFER'}
            </Text>
          </Pressable>
        </View>

        {goal.contributions && goal.contributions.length > 0 && (
          <View style={[styles.card, { borderColor: theme.text, backgroundColor: theme.background }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>TRANSACTION_LOG</Text>
            {goal.contributions.map((contribution, index) => (
              <View
                key={index}
                style={[
                  styles.contributionItem,
                  { borderBottomColor: theme.text },
                  index === goal.contributions!.length - 1 && styles.lastContribution,
                ]}>
                <View style={styles.contributionRow}>
                  <Text style={[styles.contributionAmount, { color: theme.text }]}>
                    +${contribution.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.contributionDate, { color: theme.subtleText }]}>
                    {new Date(contribution.date).toLocaleDateString()}
                  </Text>
                </View>
                {contribution.note && (
                  <Text style={[styles.contributionNote, { color: theme.subtleText }]}>
                    REF: {contribution.note.toUpperCase()}
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
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    gap: 12,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent', // just for hit area
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 2,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentAmount: {
    fontSize: 32,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  targetAmount: {
    fontSize: 16,
    fontFamily: 'Courier',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 0,
    borderWidth: 1,
    padding: 1,
  },
  progressBar: {
    height: '100%',
    borderRadius: 0,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Courier',
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 6,
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
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Courier',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  contributionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  lastContribution: {
    borderBottomWidth: 0,
  },
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributionAmount: {
    fontSize: 16,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  contributionDate: {
    fontSize: 10,
    fontFamily: 'Courier',
  },
  contributionNote: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
});
