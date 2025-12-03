import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
  TextInput,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';


interface Transaction {
  id: string;
  name: string;
  amount: number;
  category?: string;
  transaction_date?: string;
  note?: string;
  is_auto?: boolean;
  payment_method?: string;
  reference_id?: string;
  source?: string;
  sms_body?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const getGreeting = () => {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 23) return "Good Evening";
  return "NightOwl";
};

const getFormattedDate = () => {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleString("default", { month: "long" });
  const weekday = now.toLocaleString("default", { weekday: "long" });
  return `${day} ${month}, ${weekday}`;
};

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token, logout, user, refreshSession } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingTransactions, setIsFetchingTransactions] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabActionsOpacity = useRef(new Animated.Value(0)).current;

  const displayName = useMemo(() => {
    if (user?.name) {
      return user.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Goal Setter';
  }, [user]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((txn) =>
      `${txn.name} ${txn.category ?? ''} ${txn.note ?? ''}`.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const attemptFetch = async (authToken: string, path: string = '/transcation') => {
    return fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  };

  const fetchTransactions = async (isPullRefresh = false) => {
    if (!token) {
      setIsFetchingTransactions(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (isPullRefresh) setIsRefreshing(true);
      else setIsFetchingTransactions(true);
      let response = await attemptFetch(token);

      if (response.status === 401) {
        const newToken = await refreshSession();
        if (newToken) {
          response = await attemptFetch(newToken);
        }
      }

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || data || []);
    } catch (error) {
      console.error('Fetch transactions error:', error);
      Toast.show({
        type: 'error',
        text1: 'Transactions offline',
        text2: 'Unable to load your latest transactions.',
      });
    } finally {
      if (isPullRefresh) setIsRefreshing(false);
      else setIsFetchingTransactions(false);
    }
  };

  const handleLogout = async () => {
    Toast.show({ type: 'info', text1: 'See you soon 👋', text2: 'Your growth path awaits when you return.' });
    await logout();
    router.replace('/login');
  };

  const toggleFab = () => {
    const nextOpen = !fabOpen;
    setFabOpen(nextOpen);

    Animated.parallel([
      Animated.spring(fabRotation, {
        toValue: nextOpen ? 1 : 0,
        useNativeDriver: true,
        friction: 5,
        tension: 200,
      }),
      Animated.timing(fabActionsOpacity, {
        toValue: nextOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCreateGoal = () => {
    router.push('/goals/create');
    toggleFab();
  };

  const handleCreateTransaction = () => {
    router.push({ pathname: '/transactions/create' });
    toggleFab();
  };

  const handleSearchChange = (text: string) => setSearchQuery(text);

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.cardBorder,
            shadowColor: theme.glassShadow,
          },
        ]}>
        <Text style={[styles.greetingLabel, { color: theme.subtleText }]}>{getGreeting()} 👋</Text>
        <View style={styles.greetingRow}>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>Hey {displayName}</Text>
          <Image
            source={require('../../assets/images/profileAsset.png')}
            style={styles.avatar}
          />
        </View>
        <Text style={[styles.greetingSubtitle, { color: theme.subtleText }]}>{getFormattedDate()}</Text>
        <Text style={[styles.greetingSubtitle, { color: theme.subtleText, marginTop: 4 }]}> 
          Set brave goals, track mindful progress, and celebrate every self-improvement win.
        </Text>
      </View>

      <View style={[styles.transactionsCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
      >
        <View style={styles.transactionsTopRow}>
          <View>
            <Text style={[styles.transactionsTitle, { color: theme.text }]}>Ledger</Text>
            <Text style={[styles.transactionsSubtitle, { color: theme.subtleText }]}>Track every rupee, manual or auto.</Text>
          </View>
          <Pressable onPress={() => fetchTransactions(true)} style={styles.refreshButton}>
            <FontAwesome name="refresh" size={16} color={theme.tint} />
            <Text style={[styles.refreshText, { color: theme.tint }]}>Sync</Text>
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { borderColor: theme.cardBorder, backgroundColor: theme.secondarySurface }]}
        >
          <FontAwesome name="search" size={16} color={theme.subtleText} />
          <TextInput
            placeholder="Search transactions"
            placeholderTextColor={theme.subtleText}
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        {isFetchingTransactions ? (
          <View style={styles.transactionsEmpty}>
            <ActivityIndicator size="small" color={theme.tint} />
            <Text style={[styles.transactionsEmptyText, { color: theme.subtleText }]}>Loading ledger…</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.transactionsEmpty}>
            <Text style={[styles.transactionsEmptyText, { color: theme.subtleText }]}>
              {searchQuery ? 'No matches found.' : 'No transactions yet.'}
            </Text>
            {!searchQuery && (
              <Pressable onPress={handleCreateTransaction}>
                <Text style={[styles.transactionsRefresh, { color: theme.tint }]}>Create one →</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((txn) => (
              <View key={txn.id} style={[styles.transactionCard, { borderColor: theme.cardBorder }]}> 
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionTitleRow}>
                    <Text style={[styles.transactionName, { color: theme.text }]} numberOfLines={1}>
                      {txn.name}
                    </Text>
                    {txn.category && (
                      <View style={[styles.categoryBadge, { backgroundColor: theme.tint }]}> 
                        <Text style={styles.categoryText}>{txn.category}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.transactionAmount, { color: txn.amount >= 0 ? theme.tint : '#ff7676' }]}> 
                    {txn.amount >= 0 ? '+' : '-'}₹{Math.abs(txn.amount).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.transactionMetaRow}>
                  <Text style={[styles.transactionMeta, { color: theme.subtleText }]}> 
                    {txn.transaction_date ? new Date(txn.transaction_date).toLocaleString() : 'Date not available'}
                  </Text>
                  {txn.is_auto && (
                    <Text style={[styles.autoPill, { color: theme.tint, borderColor: theme.tint }]}>Auto</Text>
                  )}
                </View>

                <View style={styles.transactionDetailsGrid}>
                  {txn.payment_method && (
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: theme.subtleText }]}>Payment</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{txn.payment_method}</Text>
                    </View>
                  )}
                  {txn.reference_id && (
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: theme.subtleText }]}>Reference</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{txn.reference_id}</Text>
                    </View>
                  )}
                  {txn.source && (
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: theme.subtleText }]}>Source</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{txn.source}</Text>
                    </View>
                  )}
                </View>

                {txn.note ? (
                  <Text style={[styles.transactionNote, { color: theme.subtleText }]}>{txn.note}</Text>
                ) : null}

                {txn.sms_body ? (
                  <View style={[styles.smsBubble, { backgroundColor: theme.secondarySurface }]}> 
                    <Text style={[styles.smsLabel, { color: theme.subtleText }]}>SMS</Text>
                    <Text style={[styles.smsText, { color: theme.text }]}>{txn.sms_body}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.header}> 
        <View>
          <Text style={[styles.headerEyebrow, { color: theme.subtleText }]}>Welcome back</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{displayName}</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <FontAwesome name="sign-out" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchTransactions(true)}
            tintColor={theme.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderListHeader()}
      </ScrollView>

      <View style={styles.fabContainer}>
        {['transaction', 'goal'].map((type, index) => (
          <Animated.View
            key={type}
            style={[
              styles.fabAction,
              {
                opacity: fabActionsOpacity,
                transform: [
                  {
                    translateY: fabActionsOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -70 * (index + 1)],
                    }),
                  },
                ],
              },
            ]}>
            <Pressable
              style={[styles.fabActionButton, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
              onPress={type === 'transaction' ? handleCreateTransaction : handleCreateGoal}>
              <FontAwesome
                name={type === 'transaction' ? 'credit-card' : 'bullseye'}
                size={16}
                color={theme.tint}
              />
              <Text style={[styles.fabActionText, { color: theme.text }]}>
                {type === 'transaction' ? 'New transaction' : 'New goal'}
              </Text>
            </Pressable>
          </Animated.View>
        ))}

        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: theme.tint,
              transform: [
                {
                  rotate: fabRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            },
          ]}>
          <Pressable style={styles.fabButton} onPress={toggleFab} accessibilityLabel="Speed dial">
            <FontAwesome name="plus" size={24} color={theme.primaryText} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
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
    marginBottom: 12,
  },
  headerEyebrow: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Poppins_500Medium',
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
    paddingHorizontal: 20,
    paddingBottom: 160,
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // searchContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 12,
  //   borderRadius: 18,
  //   borderWidth: 1,
  //   paddingHorizontal: 18,
  //   paddingVertical: 14,
  // },
  // searchInput: {
  //   flex: 1,
  //   fontSize: 15,
  //   fontFamily: 'Poppins_400Regular',
  // },
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
  transactionsCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  transactionsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  transactionsSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
  },
  transactionsEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  transactionsEmptyText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  transactionsRefresh: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginTop: 4,
  },
  transactionsList: {
    gap: 16,
  },
  transactionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionName: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 1,
  },
  transactionAmount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  transactionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  autoPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  transactionDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    minWidth: '30%',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  transactionNote: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  smsBubble: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  smsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Poppins_600SemiBold',
  },
  smsText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 120,
    alignItems: 'flex-end',
  },
  fabAction: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  fabActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 180,
  },
  fabActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});