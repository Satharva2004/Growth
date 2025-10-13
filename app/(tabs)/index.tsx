import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  TextInput,
  Animated,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';

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
  contributions?: Array<{ amount: number; note?: string; date: string }>;
}

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token, logout, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fabScale = useRef(new Animated.Value(1)).current;

  const displayName = useMemo(() => {
    if (user?.name) {
      return user.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Goal Setter';
  }, [user]);

  const filteredGoals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return goals;
    return goals.filter((goal) => {
      const haystack = `${goal.name ?? ''} ${goal.description ?? ''} ${goal.category ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [goals, searchQuery]);

  const completedGoalsCount = useMemo(
    () => goals.filter((goal) => goal.isCompleted || goal.progress === 100).length,
    [goals]
  );

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async (isRefresh = false) => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await fetch(`${API_BASE}/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired ⏳',
            text2: 'Please sign in again to keep building momentum.',
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
        text1: 'Goals paused ⚠️',
        text2: 'We couldn’t refresh your journey. Try again soon.',
      });
      console.error('Fetch goals error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Toast.show({ type: 'info', text1: 'See you soon 👋', text2: 'Your growth path awaits when you return.' });
    await logout();
    router.replace('/login');
  };

  const calculateProgress = (goal: Goal) => {
    // Use progress from backend if available, otherwise calculate
    if (typeof goal.progress === 'number') {
      return goal.progress;
    }
    const current = goal.savedAmount || 0;
    const target = goal.amount || 1;
    return Math.min((current / target) * 100, 100);
  };

  const renderGoalItem = ({ item }: { item: Goal }) => {
    const progress = calculateProgress(item);
    const current = item.savedAmount || 0;

    return (
      <Pressable
        style={styles.goalCardWrapper}
        onPress={() =>
          router.push({
            pathname: '/goals/[id]',
            params: { id: item.id },
          })
        }>
        <View
          style={[
            styles.goalCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              shadowColor: theme.glassShadow,
            },
          ]}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <Text style={[styles.goalName, { color: theme.text }]}>{item.name}</Text>
              {item.category && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}
            </View>
            {item.category && (
              <View style={styles.badgeSpacer} />
            )}
          </View>
          {item.description && (
            <Text style={[styles.goalDescription, { color: theme.subtleText }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.amountRow}>
            <Text style={[styles.currentAmount, { color: theme.tint }]}>
              ${current.toFixed(2)}
            </Text>
            <Text style={[styles.targetAmount, { color: theme.text }]}>
              / ${item.amount.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.tabIconDefault }]}>
            <View
              style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.tint }]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.subtleText }]}>{progress.toFixed(0)}% complete</Text>
        </View>
      </Pressable>
    );
  };

  const animateFab = (toValue: number) => {
    Animated.spring(fabScale, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleFabPressIn = () => animateFab(0.9);
  const handleFabPressOut = () => animateFab(1);
  const handleFabPress = () => {
    router.push('/goals/create');
  };

  const handleSearchSubmit = (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    const text = event.nativeEvent.text;
    setSearchQuery(text);
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}> 
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow },
        ]}>
        <Text style={[styles.greetingLabel, { color: theme.subtleText }]}>👋 Welcome back</Text>
        <Text style={[styles.greetingTitle, { color: theme.text }]}>Hey {displayName}, design your next breakthrough ✨</Text>
        <Text style={[styles.greetingSubtitle, { color: theme.subtleText }]}>Set brave goals, track mindful progress, and celebrate every self-improvement win.</Text>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: theme.secondarySurface }]}> 
            <Text style={[styles.metricValue, { color: theme.text }]}>{goals.length}</Text>
            <Text style={[styles.metricLabel, { color: theme.subtleText }]}>Goals in progress</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: theme.secondarySurface }]}> 
            <Text style={[styles.metricValue, { color: theme.text }]}>{completedGoalsCount}</Text>
            <Text style={[styles.metricLabel, { color: theme.subtleText }]}>Milestones crushed 🎉</Text>
          </View>
        </View>
      </View>
      {/* <View style={[styles.searchContainer, { backgroundColor: theme.secondarySurface, borderColor: theme.cardBorder }]}> 
        <FontAwesome name="search" size={18} color={theme.subtleText} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Search goals, rituals, or reflection notes"
          placeholderTextColor={theme.inputPlaceholder}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={[styles.clearButton, { borderColor: theme.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={[styles.clearButtonText, { color: theme.subtleText }]}>✖️</Text>
          </Pressable>
        )}
      </View> */}
    </View>
  );

  if (isLoading) {
    return (
      <RNView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
      </RNView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dashboard</Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <FontAwesome name="sign-out" size={24} color={theme.text} />
        </Pressable>
      </View>
      <FlatList
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchGoals(true)}
            tintColor={theme.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="bullseye" size={64} color={theme.tabIconDefault} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No goals yet 🌱</Text>
            <Text style={[styles.emptySubtext, { color: theme.tabIconDefault }]}>Set your first self-improvement goal to launch your journey.</Text>
          </View>
        }
      />
      <Animated.View
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            shadowColor: theme.glassShadow,
            transform: [{ scale: fabScale }],
          },
        ]}>
        <Pressable
          style={styles.fabButton}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={handleFabPress}>
          <FontAwesome name="plus" size={24} color={theme.primaryText} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    letterSpacing: -0.5,
    fontFamily: 'Poppins_700Bold',
  },
  logoutButton: {
    padding: 8,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 20,
  },
  listHeader: {
    gap: 16,
    marginBottom: 8,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 36,
    elevation: 8,
  },
  greetingLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
  },
  goalCardWrapper: {
    marginBottom: 20,
  },
  goalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 42,
    elevation: 10,
    gap: 14,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeSpacer: {
    width: 12,
  },
  goalName: {
    fontSize: 20,
    flex: 1,
    letterSpacing: -0.2,
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 0.25,
    fontFamily: 'Poppins_500Medium',
  },
  goalDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentAmount: {
    fontSize: 28,
    letterSpacing: -0.4,
    fontFamily: 'Poppins_700Bold',
  },
  targetAmount: {
    fontSize: 18,
    marginLeft: 4,
    opacity: 0.6,
    fontFamily: 'Poppins_400Regular',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Poppins_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 12,
    overflow: 'hidden',
  },
  fabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
