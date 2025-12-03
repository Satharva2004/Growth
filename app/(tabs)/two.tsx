import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

interface Goal {
  id: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  savedAmount?: number;
  progress?: number;
  targetDate?: string;
  isCompleted?: boolean;
}

const calculateProgress = (goal: Goal) => {
  if (typeof goal.progress === 'number') {
    return goal.progress;
  }
  const current = goal.savedAmount || 0;
  const target = goal.amount || 1;
  return Math.min((current / target) * 100, 100);
};

export default function GoalsLibraryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token, logout, refreshSession } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const attemptFetch = async (authToken: string) => {
    return fetch(`${API_BASE}/goals`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  };

  const fetchGoals = async (isRefresh = false) => {
    if (!token) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      let response = await attemptFetch(token);

      if (response.status === 401) {
        const newToken = await refreshSession();
        if (newToken) {
          response = await attemptFetch(newToken);
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired ⏳',
            text2: 'Please sign back in to review your goals.',
          });
          await logout();
          router.replace('/login');
          return;
        }
        throw new Error('Failed to fetch goals');
      }

      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Unable to load goals',
        text2: 'Pull to refresh or try again later.',
      });
      console.error('Goals tab fetch error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const activeGoals = useMemo(
    () => goals.filter((goal) => !(goal.isCompleted || goal.progress === 100)),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((goal) => goal.isCompleted || goal.progress === 100),
    [goals]
  );

  const totalSaved = useMemo(() => goals.reduce((sum, goal) => sum + (goal.savedAmount || 0), 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((sum, goal) => sum + (goal.amount || 0), 0), [goals]);

  const renderGoalCard = (goal: Goal) => {
    const progress = calculateProgress(goal);
    const current = goal.savedAmount || 0;

    return (
      <Pressable
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow }]}
        onPress={() =>
          router.push({
            pathname: '/goals/[id]',
            params: { id: goal.id },
          })
        }
      >
        <View style={styles.goalHeader}>
          <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
            {goal.name}
          </Text>
          {goal.category && (
            <View style={[styles.categoryPill, { backgroundColor: theme.badgeBackground }]}> 
              <Text style={[styles.categoryText, { color: theme.badgeText }]}>{goal.category}</Text>
            </View>
          )}
        </View>
        {goal.description ? (
          <Text style={[styles.goalDescription, { color: theme.subtleText }]} numberOfLines={2}>
            {goal.description}
          </Text>
        ) : null}
        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: theme.tint }]}>${current.toFixed(2)}</Text>
          <Text style={[styles.targetAmount, { color: theme.subtleText }]}>/ ${goal.amount.toFixed(2)}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.tabIconDefault }]}> 
          <View
            style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.tint }]}
          />
        </View>
        <View style={styles.goalFooter}>
          <Text style={[styles.progressLabel, { color: theme.subtleText }]}>{progress.toFixed(0)}% complete</Text>
          {goal.targetDate && (
            <Text style={[styles.targetDate, { color: theme.subtleText }]}>Due {new Date(goal.targetDate).toLocaleDateString()}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchGoals(true)}
            tintColor={theme.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow }]}> 
          <Text style={[styles.summaryTitle, { color: theme.subtleText }]}>Goals overview</Text>
          <Text style={[styles.summaryHeadline, { color: theme.text }]}>{goals.length} total goals</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{activeGoals.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>In progress</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{completedGoals.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>Completed</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>${totalSaved.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>Saved so far</Text>
            </View>
          </View>
          <Text style={[styles.summaryHint, { color: theme.subtleText }]}>Total target ${totalTarget.toFixed(0)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Active goals</Text>
            <Pressable onPress={() => router.push('/goals/create')}>
              <Text style={[styles.sectionAction, { color: theme.tint }]}>New goal +</Text>
            </Pressable>
          </View>
          {activeGoals.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: theme.cardBorder, backgroundColor: theme.secondarySurface }]}> 
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No active goals</Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtleText }]}>Tap "New goal" to design your next milestone.</Text>
            </View>
          ) : (
            activeGoals.map(renderGoalCard)
          )}
        </View>

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed goals</Text>
            {completedGoals.map((goal) => (
              <View
                key={goal.id}
                style={[styles.completedCard, { borderColor: theme.cardBorder, backgroundColor: theme.secondarySurface }]}
              >
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
                    {goal.name}
                  </Text>
                  <Text style={[styles.completedBadge, { color: theme.badgeText, backgroundColor: theme.badgeBackground }]}>Done</Text>
                </View>
                <Text style={[styles.progressLabel, { color: theme.subtleText }]}>Target ${goal.amount.toFixed(2)}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 28,
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    gap: 14,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Poppins_500Medium',
  },
  summaryHeadline: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryMetric: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    opacity: 0.7,
  },
  summaryHint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionAction: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 10,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    elevation: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  goalDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currentAmount: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
  },
  targetAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  progressTrack: {
    height: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  targetDate: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  completedCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
});
