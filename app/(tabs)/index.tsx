
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

const HEATMAP_WEEKS = 20;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEATMAP_DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
const HEATMAP_LABELED_DAYS = new Set([1, 3, 5]);

const parseTransactionDateString = (value: string) => {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
        return direct;
    }
    const match = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ ,T]*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) return null;
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return new Date(Number(normalizedYear), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
};

export default function GoalsScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark']; // Force dark/wireframe
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
    const heatmapScrollRef = useRef<ScrollView>(null);

    const currentMonthEnd = useMemo(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1, 0);
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const totalSpend = useMemo(() => {
        if (!transactions.length) return 0;
        return transactions.reduce((sum, txn) => {
            const isIncome = txn.category?.toLowerCase() === 'income';
            if (isIncome) return sum;
            return sum + Math.abs(txn.amount);
        }, 0);
    }, [transactions]);

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

        const sorted = [...filteredTransactions].sort((a, b) => {
            const dateA = new Date(a.transaction_date || 0);
            const dateB = new Date(b.transaction_date || 0);
            return dateB.getTime() - dateA.getTime();
        });

        sorted.forEach((txn) => {
            const date = new Date(txn.transaction_date || '');
            let title = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
            if (date.toDateString() === today.toDateString()) title = 'TODAY';
            else if (date.toDateString() === yesterday.toDateString()) title = 'YESTERDAY';
            else title = title.toUpperCase();

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

    useEffect(() => {
        if (heatmapVisible && heatmapScrollRef.current) {
            setTimeout(() => {
                heatmapScrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [heatmapVisible]);

    const formatHeatmapDate = (date: Date) =>
        date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();

    const handleToggleHeatmap = () => setHeatmapVisible((prev) => !prev);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const attemptFetch = async (authToken: string, path: string = '/transcation') => {
        return fetch(`${API_BASE}${path}`, {
            headers: { Authorization: `Bearer ${authToken}` },
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

            if (!response.ok) throw new Error('Failed to fetch transactions');

            const data = await response.json();
            setTransactions(data.transactions || data || []);
        } catch (error) {
            console.error(error);
            Toast.show({ type: 'error', text1: 'OFFLINE', text2: 'Sync failed.' });
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
                name: payload.vendor ?? 'SMS_PAY',
                amount: typeof payload.amount === 'number' ? payload.amount : 0,
                category: payload.type === 'credit' ? 'Income' : 'Expense',
                transaction_date: payload.timestamp ?? now.toISOString(),
                note: payload.reference_id ? `REF:${payload.reference_id}` : 'SMS_AUTO',
                is_auto: true,
                payment_method: payload.payment_method ?? undefined,
                reference_id: payload.reference_id ?? undefined,
                source: payload.source ?? 'sms',
                sms_body: payload.raw_text ?? null,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            setTransactions((prev) => [smsTransaction, ...prev]);
            setSmsStatus('SMS_DETECTED');
            Toast.show({ type: 'success', text1: 'DATA RECEIVED', text2: smsTransaction.name });
        },
        []
    );

    const handleSmsError = useCallback((error: Error | undefined) => {
        if (!error) return;
        setSmsStatus('SMS_ERR');
    }, []);

    const handleSmsIgnored = useCallback((message: any, meta?: any) => {
        setSmsStatus(meta?.reason ?? 'SMS_IGNORED');
    }, []);

    const handleSmsSuccess = useCallback((apiResponse: any, result: any) => {
        setSmsStatus('SYNCED');
        fetchTransactions(true);
    }, []);

    useSmsTransactionHandler({
        enabled: !!token,
        onTransaction: handleSmsTransaction,
        onError: handleSmsError,
        onIgnored: handleSmsIgnored,
        onSuccess: handleSmsSuccess,
    });

    const renderHeroCard = () => {
        return (
            <View style={styles.heroWrapper}>
                {/* Stacked 3D visual effect layers */}
                <View style={[styles.cardLayer, styles.layer3, { borderColor: theme.wireframeLine || theme.text }]} />
                <View style={[styles.cardLayer, styles.layer2, { borderColor: theme.wireframeLine || theme.text }]} />

                {/* Main Card */}
                <View style={[styles.cardLayer, styles.layer1, { borderColor: theme.text, backgroundColor: '#0d0d0dff' }]}>


                    {/* Decorative corners */}
                    <View style={[styles.corner, { top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1 }]} />
                    <View style={[styles.corner, { top: -1, right: -1, borderTopWidth: 1, borderRightWidth: 1 }]} />
                    <View style={[styles.corner, { bottom: -1, left: -1, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
                    <View style={[styles.corner, { bottom: -1, right: -1, borderBottomWidth: 1, borderRightWidth: 1 }]} />

                    <View style={styles.heroContent}>
                        <View style={styles.heroHeader}>
                            <Text style={[styles.heroLabel, { color: theme.text }]}>TOTAL_EXPENDITURE</Text>
                            <View style={styles.liveIndicator}>
                                <View style={[styles.dot, { backgroundColor: theme.text }]} />
                                <Text style={[styles.liveText, { color: theme.text }]}>LIVE</Text>
                            </View>
                        </View>

                        <View style={styles.heroCenter}>
                            <Text style={[styles.heroAmount, { color: theme.text }]}>{formatCurrency(totalSpend)}</Text>
                            <View style={[styles.separator, { backgroundColor: theme.text }]} />
                            <Text style={[styles.heroSub, { color: theme.subtleText }]}>CURRENT_CYCLE</Text>
                        </View>

                        <View style={styles.heroFooter}>
                            <Pressable onPress={handleToggleHeatmap} style={({ pressed }) => [styles.actionChip, { borderColor: theme.text, opacity: pressed ? 0.7 : 1 }]}>
                                <Text style={[styles.chipText, { color: theme.text }]}>{heatmapVisible ? 'HIDE_MATRIX' : 'VIEW_MATRIX'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={[styles.tag, { borderColor: theme.text }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>SYSTEM_DASHBOARD</Text>
                </View>
                <Pressable onPress={() => router.push('/profile')}>
                    <View style={[styles.profileIcon, { borderColor: theme.text }]}>
                        <FontAwesome name="user-secret" size={16} color={theme.text} />
                    </View>
                </Pressable>
            </View>

            {/* Sticky Hero Card Area */}
            <View style={{ paddingHorizontal: 20 }}>
                <View style={styles.greetingContainer}>
                    <Text style={[styles.greetingText, { color: theme.subtleText }]}>WELCOME_BACK // </Text>
                    <Text style={[styles.greetingName, { color: theme.text }]}>{user?.name?.toUpperCase() || 'OPERATOR'}</Text>
                </View>
                {renderHeroCard()}
            </View>

            <ScrollView contentContainerStyle={styles.listContent} refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchTransactions(true)} tintColor={theme.text} />
            } showsVerticalScrollIndicator={false}>

                {heatmapVisible && (
                    <View style={[styles.heatmapContainer, { borderColor: theme.text, marginTop: 20 }]}>
                        <View style={styles.heatmapHeader}>
                            <Text style={[styles.heatmapTitle, { color: theme.text }]}>ACTIVITY_MATRIX</Text>
                            <Text style={[styles.heatmapSubtitle, { color: theme.subtleText }]}>{HEATMAP_WEEKS}W_HISTORY</Text>
                        </View>

                        <View style={styles.heatmapBody}>
                            <View style={styles.heatmapLabelColumn}>
                                {HEATMAP_DAY_ORDER.map((dayIndex) => (
                                    <Text key={`label-${dayIndex}`} style={[styles.heatmapRowLabel, { color: theme.subtleText }]}>
                                        {HEATMAP_LABELED_DAYS.has(dayIndex) ? WEEKDAY_LABELS[dayIndex].slice(0, 1).toUpperCase() : ''}
                                    </Text>
                                ))}
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.heatmapScrollContent}
                                style={styles.heatmapScroll}
                                ref={heatmapScrollRef}
                            >
                                <View style={styles.heatmapScrollableArea}>
                                    <View style={styles.heatmapGrid}>
                                        {HEATMAP_DAY_ORDER.map((dayIndex, rowIndex) => (
                                            <View key={`heatmap-row-${dayIndex}`} style={styles.heatmapRow}>
                                                {heatmapWeekColumns.map((column, columnIndex) => {
                                                    const cell = column[rowIndex];
                                                    const intensity = cell.value > 0 ? (cell.value / maxHeatmapValue) : 0;
                                                    return (
                                                        <Pressable
                                                            key={cell.key}
                                                            onPress={() => setSelectedHeatmapCell(cell)}
                                                            style={({ pressed }) => [
                                                                styles.heatmapCell,
                                                                {
                                                                    borderColor: theme.text,
                                                                    backgroundColor: cell.value > 0 ? theme.primary : 'transparent',
                                                                    opacity: cell.value > 0 ? (0.2 + (intensity * 0.8)) : 1,
                                                                    borderWidth: 0.5,
                                                                },
                                                            ]}
                                                        />
                                                    );
                                                })}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>
                        </View>

                        <View style={styles.heatmapMetaRow}>
                            <Text style={[styles.heatmapMetaValue, { color: theme.text }]}>
                                {selectedHeatmapCell
                                    ? `${formatHeatmapDate(selectedHeatmapCell.date)} : ${formatCurrency(selectedHeatmapCell.value)}`
                                    : 'SELECT_CELL'}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[styles.transactionsCard, { borderColor: theme.text, backgroundColor: theme.background }]}>
                    <View style={styles.transactionsTopRow}>
                        <Text style={[styles.transactionsTitle, { color: theme.text }]}>LEDGER_LOG</Text>
                        <Pressable onPress={() => fetchTransactions(true)} style={[styles.refreshButton, { borderColor: theme.tint }]}>
                            <FontAwesome name="refresh" size={10} color={theme.tint} />
                        </Pressable>
                    </View>

                    <View style={[styles.searchContainer, { borderColor: theme.text }]}>
                        <FontAwesome name="search" size={12} color={theme.subtleText} />
                        <TextInput
                            placeholder="> QUERY_LEDGER..."
                            placeholderTextColor={theme.subtleText}
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            style={[styles.searchInput, { color: theme.text }]}
                        />
                    </View>

                    {isFetchingTransactions ? (
                        <View style={styles.transactionsEmpty}>
                            <ActivityIndicator size="small" color={theme.text} />
                        </View>
                    ) : filteredTransactions.length === 0 ? (
                        <View style={styles.transactionsEmpty}>
                            <Text style={[styles.transactionsEmptyText, { color: theme.subtleText }]}>NO_DATA_FOUND</Text>
                        </View>
                    ) : (
                        <View style={styles.transactionsList}>
                            {groupedTransactions.map((group) => (
                                <View key={group.title}>
                                    <View style={styles.sectionHeaderContainer}>
                                        <View style={[styles.sectionLine, { backgroundColor: theme.subtleText }]} />
                                        <Text style={[styles.sectionHeader, { color: theme.subtleText, backgroundColor: theme.background }]}> {group.title} </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: theme.subtleText }]} />
                                    </View>
                                    {group.data.map((txn, index) => {
                                        const isCredit = txn.category?.toLowerCase() === 'income';
                                        return (
                                            <View key={txn.id}>
                                                <Pressable
                                                    onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: txn.id } })}
                                                    style={({ pressed }) => [
                                                        styles.transactionRow,
                                                        {
                                                            borderColor: theme.wireframeLine || theme.text,
                                                            borderLeftWidth: 4,
                                                            borderLeftColor: isCredit ? theme.tint : (theme.wireframeLine || theme.text),
                                                            backgroundColor: pressed ? theme.surface : theme.background,
                                                            opacity: pressed ? 0.9 : 1
                                                        }
                                                    ]}
                                                >
                                                    <View style={styles.transactionContent}>
                                                        <View style={styles.transactionTitleRow}>
                                                            <Text style={[styles.transactionName, { color: theme.text }]} numberOfLines={1}>
                                                                {txn.name.toUpperCase()}
                                                            </Text>
                                                            {txn.is_auto && (
                                                                <View style={styles.autoTag}>
                                                                    <Text style={[styles.autoTagText, { color: theme.text }]}>[A]</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={[styles.transactionCategory, { color: theme.subtleText }]}>
                                                            {txn.category?.toUpperCase() || 'UNCATEGORIZED'}
                                                        </Text>
                                                    </View>

                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={[styles.transactionAmount, { color: isCredit ? theme.tint : theme.text }]}>
                                                            {isCredit ? '+' : ''}{formatCurrency(txn.amount)}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.fabContainer}>
                {['transaction', 'goal'].map((type, index) => (
                    <Animated.View key={type} style={[styles.fabAction, { opacity: fabActionsOpacity, transform: [{ translateY: fabActionsOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, -60 * (index + 1)] }) }] }]}>
                        <Pressable style={[styles.fabActionButton, { backgroundColor: theme.background, borderColor: theme.tint }]} onPress={type === 'transaction' ? handleCreateTransaction : handleCreateGoal}>
                            <Text style={[styles.fabActionText, { color: theme.tint }]}>{type === 'transaction' ? 'NEW_TXN' : 'NEW_GOAL'}</Text>
                        </Pressable>
                    </Animated.View>
                ))}

                <Animated.View style={[styles.fab, { transform: [{ rotate: fabRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }]}>
                    <Pressable style={[styles.fabButton, { backgroundColor: theme.primary }]} onPress={toggleFab}>
                        <FontAwesome name="plus" size={20} color={theme.primaryText} />
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tag: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    profileIcon: {
        width: 32,
        height: 32,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
    },
    heroWrapper: {
        height: 220, // Height for the stack
        width: '100%',
        position: 'relative',
        marginBottom: 20,
        marginTop: 10,
    },
    cardLayer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderRadius: 12,
    },
    layer3: {
        top: 10,
        left: 10,
        opacity: 0.3,
        zIndex: 1,
    },
    layer2: {
        top: 5,
        left: 5,
        opacity: 0.6,
        zIndex: 2,
    },
    layer1: {
        top: 0,
        left: 0,
        zIndex: 3,
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderColor: 'white', // Will be overridden
    },
    heroContent: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroLabel: {
        fontFamily: 'Courier',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 4,
        height: 4,
    },
    liveText: {
        fontSize: 8,
        fontFamily: 'Courier',
    },
    heroCenter: {
        alignItems: 'center',
        gap: 8,
    },
    heroAmount: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: -1,
    },
    separator: {
        height: 1,
        width: 40,
    },
    heroSub: {
        fontSize: 10,
        fontFamily: 'Courier',
        textTransform: 'uppercase',
    },
    heroFooter: {
        alignItems: 'flex-end',
    },
    // greeting styles
    greetingContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'baseline',
    },
    greetingText: {
        fontSize: 12,
        fontFamily: 'Courier',
    },
    greetingName: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
    },
    userName: {
        fontSize: 10,
        fontFamily: 'Courier',
        letterSpacing: 1,
    },
    actionChip: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },

    heatmapContainer: {
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    heatmapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    heatmapTitle: {
        fontSize: 12,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    heatmapSubtitle: {
        fontSize: 10,
        fontFamily: 'Courier',
    },
    heatmapBody: {
        flexDirection: 'row',
        gap: 8,
    },
    heatmapLabelColumn: {
        justifyContent: 'space-around',
        paddingVertical: 4,
    },
    heatmapRowLabel: {
        fontSize: 8,
        fontFamily: 'Courier',
        textAlign: 'center',
    },
    heatmapScroll: {
        flex: 1,
    },
    heatmapScrollContent: {
        paddingRight: 16,
    },
    heatmapScrollableArea: {
        flexDirection: 'row',
    },
    heatmapGrid: {
        gap: 4,
    },
    heatmapRow: {
        flexDirection: 'row',
        gap: 4,
    },
    heatmapCell: {
        width: 12,
        height: 12,
    },
    heatmapMetaRow: {
        alignItems: 'flex-end',
    },
    heatmapMetaValue: {
        fontSize: 10,
        fontFamily: 'Courier',
    },
    transactionsCard: {
        borderWidth: 1,
        padding: 20,
        gap: 16,
        marginTop: 20,
    },
    transactionsTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionsTitle: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    refreshButton: {
        borderWidth: 1,
        padding: 6,
        borderRadius: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Courier',
        fontSize: 12,
    },
    transactionsList: {
        gap: 8,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        opacity: 0.3,
    },
    sectionHeader: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        marginHorizontal: 8,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 2,
        marginBottom: 4,
        gap: 12,
    },
    transactionIcon: {
        width: 24,
        height: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionContent: {
        flex: 1,
    },
    transactionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    transactionName: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 0.5,
    },
    transactionCategory: {
        fontSize: 10,
        fontFamily: 'Courier',
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    autoTag: {
        paddingHorizontal: 4,
    },
    autoTagText: {
        fontSize: 8,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    transactionsEmpty: {
        padding: 20,
        alignItems: 'center',
    },
    transactionsEmptyText: {
        fontFamily: 'Courier',
        fontSize: 12,
    },
    fabContainer: {
        position: 'absolute',
        right: 24,
        bottom: 40,
        alignItems: 'flex-end',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 0, // Sharp logic? Square fab might be too much, but let's keep it rounded for now or make it square? Square looks cool.
        // Keeping rounded for usability standard, but maybe less rounded
    },
    fabButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabAction: {
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
    fabActionButton: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fabActionText: {
        fontSize: 12,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
});
