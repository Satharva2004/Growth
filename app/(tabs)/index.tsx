import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSmsTransactionHandler } from '@/utils/smsReader';


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

const HEATMAP_WEEKS = 30;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEATMAP_DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const HEATMAP_LABELED_DAYS = new Set([1, 3, 5]);
const HEATMAP_CELL_SIZE = 16;
const HEATMAP_CELL_GAP = 6;
const HEATMAP_MONTH_LABEL_WIDTH = HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP + 12;

const hexToRgba = (hex: string, alpha: number) => {
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const numericValue = parseInt(sanitized, 16);
  const r = (numericValue >> 16) & 255;
  const g = (numericValue >> 8) & 255;
  const b = numericValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const parseTransactionDateString = (value: string) => {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ ,T]*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) {
    return null;
  }

  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
  const normalizedYear = year.length === 2 ? `20${year}` : year;
  return new Date(
    Number(normalizedYear),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
};

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { token, user, refreshSession } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingTransactions, setIsFetchingTransactions] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ key: string; date: Date; value: number } | null>(null);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabActionsOpacity = useRef(new Animated.Value(0)).current;

  const currentMonthEnd = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;

  const totalSpend = useMemo(() => {
    if (!transactions.length) return 0;
    return transactions.reduce((sum, txn) => {
      const isIncome = txn.category?.toLowerCase() === 'income';
      if (isIncome) return sum;
      return sum + Math.abs(txn.amount);
    }, 0);
  }, [transactions]);

  const displayName = useMemo(() => {
    if (user?.name) {
      return user.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Goal Setter';
  }, [user]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((txn) =>
      `${txn.name} ${txn.category ?? ''} ${txn.note ?? ''}`.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const groupedTransactions = useMemo(() => {
    const groups: { title: string; data: Transaction[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Sort by date descending first
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date || 0);
      const dateB = new Date(b.transaction_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    sorted.forEach((txn) => {
      const date = new Date(txn.transaction_date || '');
      let title = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

      if (date.toDateString() === today.toDateString()) title = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) title = 'Yesterday';

      const existingGroup = groups.find((g) => g.title === title);
      if (existingGroup) {
        existingGroup.data.push(txn);
      } else {
        groups.push({ title, data: [txn] });
      }
    });
    return groups;
  }, [filteredTransactions]);

  const dailySpendTotals = useMemo<Record<string, number>>(() => {
    return transactions.reduce<Record<string, number>>((acc, txn) => {
      if (!txn.transaction_date) return acc;
      const isIncome = txn.category?.toLowerCase() === 'income';
      if (isIncome) return acc;
      const parsedDate = parseTransactionDateString(txn.transaction_date);
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) return acc;
      const date = new Date(parsedDate);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      acc[key] = (acc[key] ?? 0) + Math.abs(txn.amount);
      return acc;
    }, {});
  }, [transactions]);

  const heatmapCells = useMemo(() => {
    const anchorDate = new Date(currentMonthEnd);
    const cells: { key: string; date: Date; value: number }[] = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const date = new Date(anchorDate);
      date.setDate(anchorDate.getDate() - i);
      const key = date.toISOString().split('T')[0];
      cells.push({ key, date, value: dailySpendTotals[key] ?? 0 });
    }
    return cells;
  }, [dailySpendTotals, currentMonthEnd]);

  const maxHeatmapValue = useMemo(() => {
    return heatmapCells.reduce((max, cell) => Math.max(max, cell.value), 0);
  }, [heatmapCells]);

  const heatmapColumns = useMemo(() => {
    const columns: { key: string; date: Date; value: number }[][] = [];
    for (let week = 0; week < HEATMAP_WEEKS; week++) {
      const start = week * 7;
      columns.push(heatmapCells.slice(start, start + 7));
    }
    return columns;
  }, [heatmapCells]);

  const heatmapWeekColumns = useMemo(() => {
    return heatmapColumns.map((column, columnIndex) => {
      return HEATMAP_DAY_ORDER.map((dayIndex) => {
        const match = column.find((cell) => cell.date.getDay() === dayIndex);
        if (match) return match;
        const referenceDate = column[column.length - 1]?.date ?? new Date();
        const fallbackDate = new Date(referenceDate);
        const offset = (dayIndex + 7 - fallbackDate.getDay()) % 7;
        fallbackDate.setDate(fallbackDate.getDate() + offset);
        return {
          key: `placeholder-${columnIndex}-${dayIndex}`,
          date: fallbackDate,
          value: 0,
        };
      });
    });
  }, [heatmapColumns]);

  const heatmapContentWidth = useMemo(() => {
    if (!heatmapWeekColumns.length) return 0;
    return heatmapWeekColumns.length * (HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP);
  }, [heatmapWeekColumns]);

  const heatmapMonthLabels = useMemo(() => {
    let lastMonth = -1;
    return heatmapColumns.map((column) => {
      const anchor = column[column.length - 1];
      if (!anchor) return '';
      const month = anchor.date.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        return anchor.date.toLocaleString('default', { month: 'short' });
      }
      return '';
    });
  }, [heatmapColumns]);

  const mostActiveHeatmapDay = useMemo(() => {
    if (!heatmapCells.length) {
      return { key: '', date: new Date(), value: 0 };
    }
    return heatmapCells.reduce((top, cell) => (cell.value > top.value ? cell : top), heatmapCells[0]);
  }, [heatmapCells]);

  const formatHeatmapDate = (date: Date) =>
    date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  const getHeatmapCellColor = (value: number) => {
    if (!value || maxHeatmapValue === 0) {
      return theme.secondarySurface;
    }
    const intensity = value / maxHeatmapValue;
    const alpha = 0.3 + intensity * 0.5;
    return hexToRgba(theme.toastSuccess, Math.min(alpha, 0.9));
  };

  const handleToggleHeatmap = () => setHeatmapVisible((prev) => !prev);

  useEffect(() => {
    if (!heatmapVisible) {
      setSelectedHeatmapCell(null);
    }
  }, [heatmapVisible]);

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
        console.error('Fetch failed with status:', response.status);
        const text = await response.text();
        console.error('Fetch failed with response:', text);
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

  const handleSmsTransaction = useCallback(
    (payload: any) => {
      if (!payload) return;
      const now = new Date();
      const smsTransaction: Transaction = {
        id: `sms-${now.getTime()}`,
        name: payload.vendor ?? 'SMS transaction',
        amount: typeof payload.amount === 'number' ? payload.amount : 0,
        category: payload.type === 'credit' ? 'Income' : 'Expense',
        transaction_date: payload.timestamp ?? now.toISOString(),
        note: payload.reference_id ? `Ref: ${payload.reference_id}` : 'Imported from SMS',
        is_auto: true,
        payment_method: payload.payment_method ?? undefined,
        reference_id: payload.reference_id ?? undefined,
        source: payload.source ?? 'sms',
        sms_body: payload.raw_text ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      setTransactions((prev) => [smsTransaction, ...prev]);
      setSmsStatus('Transaction detected from SMS');
      Toast.show({
        type: 'success',
        text1: 'SMS captured',
        text2: smsTransaction.name,
      });
    },
    []
  );

  const handleSmsError = useCallback((error: Error | undefined) => {
    if (!error) return;
    setSmsStatus('SMS listener error');
    Toast.show({
      type: 'error',
      text1: 'SMS listener failed',
      text2: error.message,
    });
  }, []);

  const handleSmsIgnored = useCallback((message: any, meta?: any) => {
    setSmsStatus(meta?.reason ?? 'SMS ignored');
  }, []);

  const handleSmsSuccess = useCallback((apiResponse: any, result: any) => {
    console.log('🎉 SMS Transaction saved to API:', apiResponse);
    setSmsStatus('Transaction synced to server');
    Toast.show({
      type: 'success',
      text1: '💰 Transaction Saved!',
      text2: `₹${result.amount} ${result.type === 'credit' ? 'credited' : 'debited'} - Synced to server`,
      visibilityTime: 4000,
    });
    // Refresh transactions to get the new one from server
    fetchTransactions(true);
  }, []);

  // @ts-ignore - JS file inference issue
  useSmsTransactionHandler({
    enabled: !!token,
    onTransaction: handleSmsTransaction,
    onError: handleSmsError,
    onIgnored: handleSmsIgnored,
    onSuccess: handleSmsSuccess,
  });

  const renderListHeader = () => {
    const cardLast4 = Math.abs(Math.round(totalSpend)).toString().slice(-4).padStart(4, '0');
    const cardNumberBlocks = ['****', '****', '****', cardLast4];
    const heatmapDayLabels = ['Mon', 'Wed', 'Fri'];

    return (
      <View style={styles.listHeader}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.tint,
              borderColor: theme.cardBorder,
              shadowColor: theme.glassShadow,
            },
          ]}>
          <View
            style={[
              styles.cardOverlay,
              styles.cardOverlayOne,
              { backgroundColor: theme.primaryText },
            ]}
          />
          <View
            style={[
              styles.cardOverlay,
              styles.cardOverlayTwo,
              { backgroundColor: theme.primaryText },
            ]}
          />
          <View style={styles.cardTopRow}>
            <View>
              <Text style={[styles.metricLabel, { color: theme.primaryText, opacity: 0.75 }]}>Total spend</Text>
              <Text style={[styles.cardBalanceValue, { color: theme.primaryText }]}>{formatCurrency(totalSpend)}</Text>
            </View>
            <View style={styles.cardChipStack}>
              <Pressable
                onPress={handleToggleHeatmap}
                style={({ pressed }) => [
                  styles.cardChip,
                  {
                    backgroundColor: theme.primaryText,
                    opacity: pressed ? 1 : 0.9,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle spend heatmap"
                hitSlop={6}
              >
                <View style={[styles.cardChipInset, { borderColor: theme.tint }]} />
              </Pressable>
              <FontAwesome name="wifi" size={18} color={theme.primaryText} style={styles.cardWaveIcon} />
            </View>
          </View>
          {/* <View style={styles.cardNumberRow}>
            {cardNumberBlocks.map((block, index) => (
              <Text key={`${block}-${index}`} style={[styles.cardNumberText, { color: theme.primaryText }]}>
                {block}
              </Text>
            ))}
          </View> */}
          <View style={styles.cardFooterRow}>
            <View>
              <Text style={[styles.cardFooterLabel, { color: theme.primaryText, opacity: 0.7 }]}>Card holder</Text>
              <Text style={[styles.cardFooterValue, { color: theme.primaryText }]}>{displayName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardFooterLabel, { color: theme.primaryText, opacity: 0.7 }]}>Updated</Text>
              <Text style={[styles.cardFooterValue, { color: theme.primaryText }]}>{getFormattedDate()}</Text>
            </View>
          </View>
          <Text style={[styles.cardTagline, { color: theme.primaryText, opacity: 0.75 }]}>
            Set brave goals, track mindful progress, and celebrate every self-improvement win.
          </Text>
        </View>

        {heatmapVisible && (
          <View
            style={[
              styles.heatmapContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                shadowColor: theme.glassShadow,
              },
            ]}
          >
            <View style={styles.heatmapHeader}>
              <View>
                <Text style={[styles.heatmapTitle, { color: theme.text }]}>Spend activity</Text>
                <Text style={[styles.heatmapSubtitle, { color: theme.subtleText }]}>
                  {`Last ${HEATMAP_WEEKS} weeks`}
                </Text>
              </View>
              <Text style={[styles.heatmapSubtitle, { color: theme.subtleText }]}>Tap a day to inspect</Text>
            </View>

            <View style={styles.heatmapBody}>
              <View style={styles.heatmapLabelColumn}>
                {HEATMAP_DAY_ORDER.map((dayIndex) => (
                  <Text
                    key={`label-${dayIndex}`}
                    style={[styles.heatmapRowLabel, { color: theme.subtleText }]}
                  >
                    {HEATMAP_LABELED_DAYS.has(dayIndex) ? WEEKDAY_LABELS[dayIndex].slice(0, 3) : ''}
                  </Text>
                ))}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                bounces={false}
                contentContainerStyle={styles.heatmapScrollContent}
                style={styles.heatmapScroll}
              >
                <View
                  style={[
                    styles.heatmapScrollableArea,
                    {
                      width: Math.max(
                        heatmapContentWidth,
                        HEATMAP_WEEKS * (HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP)
                      ),
                    },
                  ]}
                >
                  <View style={styles.heatmapMonthLabels}>
                    {heatmapWeekColumns.map((_, index) => (
                      <Text
                        key={`month-${index}`}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                        style={[
                          styles.heatmapMonthLabel,
                          { color: heatmapMonthLabels[index] ? theme.subtleText : 'transparent' },
                          index === heatmapWeekColumns.length - 1 && styles.heatmapLastColumn,
                        ]}
                      >
                        {heatmapMonthLabels[index]}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.heatmapGrid}>
                    {HEATMAP_DAY_ORDER.map((dayIndex, rowIndex) => (
                      <View
                        key={`heatmap-row-${dayIndex}`}
                        style={[styles.heatmapRow, rowIndex === HEATMAP_DAY_ORDER.length - 1 && styles.heatmapRowLast]}
                      >
                        {heatmapWeekColumns.map((column, columnIndex) => {
                          const cell = column[rowIndex];
                          const isSelected = selectedHeatmapCell?.key === cell.key;
                          return (
                            <Pressable
                              key={cell.key}
                              onPress={() => setSelectedHeatmapCell(cell)}
                              style={({ pressed }) => [
                                styles.heatmapCell,
                                {
                                  backgroundColor: getHeatmapCellColor(cell.value),
                                  borderColor: isSelected ? theme.tint : 'transparent',
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`${formatHeatmapDate(cell.date)} · ${formatCurrency(cell.value)}`}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>

            <View style={styles.heatmapLegendRow}>
              <Text style={[styles.heatmapLegendLabel, { color: theme.subtleText }]}>Less</Text>
              {[0, 0.25, 0.5, 0.75, 1].map((step) => (
                <View
                  key={`legend-${step}`}
                  style={[
                    styles.heatmapLegendDot,
                    {
                      backgroundColor:
                        step === 0
                          ? theme.secondarySurface
                          : hexToRgba(theme.toastSuccess, 0.3 + step * 0.4),
                    },
                  ]}
                />
              ))}
              <Text style={[styles.heatmapLegendLabel, { color: theme.subtleText }]}>More</Text>
            </View>

            <View style={styles.heatmapMetaRow}>
              <View>
                <Text style={[styles.heatmapMetaLabel, { color: theme.subtleText }]}>Most active day</Text>
                <Text style={[styles.heatmapMetaValue, { color: theme.text }]}
                >
                  {mostActiveHeatmapDay.value
                    ? `${formatHeatmapDate(mostActiveHeatmapDay.date)} · ${formatCurrency(mostActiveHeatmapDay.value)}`
                    : 'No spend recorded'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.heatmapMetaLabel, { color: theme.subtleText }]}>Selected day</Text>
                <Text style={[styles.heatmapMetaValue, { color: theme.text }]}
                >
                  {selectedHeatmapCell
                    ? `${formatHeatmapDate(selectedHeatmapCell.date)} · ${formatCurrency(selectedHeatmapCell.value)}`
                    : 'Tap a cell'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.transactionsCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
        >
          <View style={styles.transactionsTopRow}>
            <View>
              <Text style={[styles.transactionsTitle, { color: theme.text }]}>Recent Transactions</Text>
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
              {groupedTransactions.map((group) => (
                <View key={group.title}>
                  <Text style={[styles.sectionHeader, { color: theme.subtleText }]}>{group.title}</Text>
                  {group.data.map((txn, index) => {
                    const isCredit = txn.category?.toLowerCase() === 'income' || (txn.amount > 0 && txn.category !== 'Expense');
                    return (
                      <View key={txn.id}>
                        <Pressable
                          onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: txn.id } })}
                          style={({ pressed }) => [
                            styles.transactionRow,
                            { opacity: pressed ? 0.7 : 1 }
                          ]}
                        >
                          <View style={[styles.transactionIcon, { backgroundColor: isCredit ? '#E0F2F1' : theme.secondarySurface }]}>
                            <FontAwesome
                              name={isCredit ? "arrow-down" : "shopping-bag"}
                              size={18}
                              color={isCredit ? "#00695C" : theme.text}
                            />
                          </View>

                          <View style={styles.transactionContent}>
                            <View style={styles.transactionTitleRow}>
                              <Text style={[styles.transactionName, { color: theme.text }]} numberOfLines={1}>
                                {txn.name}
                              </Text>
                              {txn.is_auto && (
                                <View style={styles.autoTag}>
                                  <FontAwesome name="bolt" size={8} color={theme.tint} />
                                  <Text style={[styles.autoTagText, { color: theme.tint }]}>Auto</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.transactionCategory, { color: theme.subtleText }]}>
                              {txn.category || 'Uncategorized'} · {new Date(txn.transaction_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>

                            {txn.sms_body && (
                              <Text numberOfLines={1} style={[styles.smsPreview, { color: theme.subtleText }]}>
                                "{txn.sms_body}"
                              </Text>
                            )}
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.transactionAmount, { color: isCredit ? '#00A86B' : theme.text }]}>
                              {isCredit ? '+' : ''}{formatCurrency(txn.amount)}
                            </Text>
                            {txn.payment_method && (
                              <Text style={[styles.transactionMeta, { color: theme.subtleText, fontSize: 10 }]}>
                                {txn.payment_method}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                        {index < group.data.length - 1 && <View style={[styles.separator, { backgroundColor: theme.cardBorder }]} />}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greetingLabel, { color: theme.subtleText }]}>{getGreeting()} 👋</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Hey, {displayName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Logout moved to Profile tab */}
        </View>
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
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    gap: 18,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 42,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardOverlay: {
    position: 'absolute',
    width: 200,
    height: 200,
    opacity: 0.08,
    borderRadius: 999,
  },
  cardOverlayOne: {
    top: -40,
    right: -60,
  },
  cardOverlayTwo: {
    bottom: -60,
    left: -40,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBalanceValue: {
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  cardChipStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardChip: {
    width: 42,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  cardChipInset: {
    width: '70%',
    height: '60%',
    borderRadius: 6,
    borderWidth: 1,
    opacity: 0.6,
  },
  cardWaveIcon: {
    transform: [{ rotate: '90deg' }],
  },
  cardNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardNumberText: {
    fontSize: 18,
    letterSpacing: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardFooterLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: 'Poppins_500Medium',
  },
  cardFooterValue: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  cardTagline: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 18,
  },
  heatmapContainer: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  heatmapTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  heatmapSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  heatmapBody: {
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  heatmapLabelColumn: {
    gap: 6,
    paddingRight: 4,
    alignItems: 'flex-end',
    width: 34,
    justifyContent: 'center',
  },
  heatmapMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  heatmapMonthLabels: {
    flexDirection: 'row',
    gap: 6, // HEATMAP_CELL_GAP
    marginBottom: 6,
    alignItems: 'center',
  },
  heatmapMonthLabel: {
    width: 16, // HEATMAP_CELL_SIZE
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'left',
    overflow: 'visible',
  },
  heatmapLastColumn: {
    marginRight: 0,
  },
  heatmapScroll: {
    flex: 1,
  },
  heatmapScrollContent: {
    paddingBottom: 4,
  },
  heatmapScrollableArea: {
    flexDirection: 'column',
    gap: 6,
  },
  heatmapGrid: {
    gap: 6, // HEATMAP_CELL_GAP
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // HEATMAP_CELL_GAP
  },
  heatmapRowLast: {
    marginBottom: 0,
  },
  heatmapRowLabel: {
    width: 40,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'right',
    top: 12,
  },
  heatmapRowCells: {
    flexDirection: 'row',
    gap: 6,
  },
  heatmapCell: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heatmapLegendLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  heatmapLegendDot: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  heatmapMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  heatmapMetaLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Poppins_500Medium',

  },
  heatmapMetaValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
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
    gap: 8,
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
  sectionHeader: {
    fontSize: 12,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 4,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
    gap: 2,
  },
  transactionCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  smsPreview: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.7,
  },
  autoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoTagText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    marginLeft: 64, // Align with content, skipping icon
    opacity: 0.5,
  },
});