
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
  const theme = Colors[colorScheme ?? 'dark']; // Force dark/wireframe
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
            text1: 'SESSION EXPIRED',
            text2: 'Re-authenticate to access data.',
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
        text1: 'DATA_FETCH_ERROR',
        text2: 'Connection failed.',
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
        style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.text }]}
        onPress={() =>
          router.push({
            pathname: '/goals/[id]',
            params: { id: goal.id },
          })
        }
      >
        <View style={styles.goalHeader}>
          <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
            {goal.name.toUpperCase()}
          </Text>
          {goal.category && (
            <View style={[styles.categoryPill, { borderColor: theme.text }]}>
              <Text style={[styles.categoryText, { color: theme.text }]}>{goal.category}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: theme.text }]}>${current.toFixed(2)}</Text>
          <Text style={[styles.targetAmount, { color: theme.subtleText }]}> / ${goal.amount.toFixed(2)}</Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.subtleText + '40' }]}>
          <View
            style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.text }]}
          />
        </View>
        <View style={styles.goalFooter}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>PROG: {progress.toFixed(0)}%</Text>
          {goal.targetDate && (
            <Text style={[styles.targetDate, { color: theme.subtleText }]}>DUE: {new Date(goal.targetDate).toISOString().split('T')[0]}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
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
            tintColor={theme.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { borderColor: theme.text }]}>
          <View style={[styles.corner, { top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1, borderColor: theme.text }]} />
          <View style={[styles.corner, { top: -1, right: -1, borderTopWidth: 1, borderRightWidth: 1, borderColor: theme.text }]} />

          <Text style={[styles.summaryTitle, { color: theme.subtleText }]}>SYSTEM_OVERVIEW</Text>
          <Text style={[styles.summaryHeadline, { color: theme.text }]}>{goals.length} ACTIVE_NODES</Text>

          <View style={[styles.divider, { backgroundColor: theme.text }]} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{activeGoals.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>ACTIVE</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{completedGoals.length}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>COMPLETE</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>${totalSaved.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: theme.subtleText }]}>ACCUMULATED</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>ACTIVE_OPERATIONS</Text>
            <Pressable onPress={() => router.push('/goals/create')} style={[styles.addButton, { borderColor: theme.text }]}>
              <Text style={[styles.sectionAction, { color: theme.text }]}>NEW_OP +</Text>
            </Pressable>
          </View>
          {activeGoals.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: theme.cardBorder }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO_DATA</Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtleText }]}>Initialize new objective to begin.</Text>
            </View>
          ) : (
            activeGoals.map(renderGoalCard)
          )}
        </View>

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>ARCHIVED_OPS</Text>
            {completedGoals.map((goal) => (
              <View
                key={goal.id}
                style={[styles.completedCard, { borderColor: theme.cardBorder }]}
              >
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalTitle, { color: theme.text, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                    {goal.name.toUpperCase()}
                  </Text>
                  <Text style={[styles.completedBadge, { color: theme.background, backgroundColor: theme.text }]}>[DONE]</Text>
                </View>
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
    gap: 32,
  },
  summaryCard: {
    borderWidth: 1,
    padding: 24,
    gap: 16,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  summaryTitle: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  summaryHeadline: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.5,
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
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Courier',
    marginTop: 4,
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
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  addButton: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  sectionAction: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  goalCard: {
    borderWidth: 1,
    padding: 20,
    gap: 12,
    borderRadius: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  categoryPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentAmount: {
    fontSize: 24,
    fontFamily: 'Courier', // Monospace for numbers
    fontWeight: 'bold',
  },
  targetAmount: {
    fontSize: 14,
    fontFamily: 'Courier',
  },
  progressTrack: {
    height: 6,
    borderRadius: 0, // Sharp
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 0,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  targetDate: {
    fontSize: 10,
    fontFamily: 'Courier',
  },
  emptyState: {
    borderWidth: 1,
    padding: 20,
    gap: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Courier',
    textAlign: 'center',
  },
  completedCard: {
    borderWidth: 1,
    padding: 16,
    opacity: 0.6,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
});
