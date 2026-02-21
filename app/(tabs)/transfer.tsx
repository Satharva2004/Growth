import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/constants/Config';

interface Transaction {
    id: string;
    name: string;
    amount: number;
    category?: string;
    transaction_date?: string;
    note?: string;
    payment_method?: string;
    image_address?: string | null;
}

interface DayGroup {
    label: string;
    dateKey: string;
    total: number;
    items: Transaction[];
}

function groupByDay(txns: Transaction[]): DayGroup[] {
    const map = new Map<string, DayGroup>();
    for (const t of txns) {
        const d = t.transaction_date ? new Date(t.transaction_date) : new Date();
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'short' });
        if (!map.has(key)) map.set(key, { label, dateKey: key, total: 0, items: [] });
        const g = map.get(key)!;
        g.total += t.category?.toLowerCase() === 'income' ? t.amount : -t.amount;
        g.items.push(t);
    }
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function fmtTime(dateStr?: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(n: number) {
    return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransferScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { token, refreshSession } = useAuth();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter states
    const [period, setPeriod] = useState<'All' | 'Week' | 'Month'>('All');
    const [methodFilter, setMethodFilter] = useState<'All' | 'Card' | 'Cash'>('All');
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Food' | 'Shopping' | 'Work' | 'Income'>('All');

    // UI States
    const [activeDropdown, setActiveDropdown] = useState<'period' | 'method' | 'category' | null>(null);

    const filteredTransactions = useMemo(() => {
        let result = [...transactions];
        if (period !== 'All') {
            const now = new Date();
            const days = period === 'Week' ? 7 : 30;
            const limit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            result = result.filter(t => new Date(t.transaction_date || '') >= limit);
        }
        if (methodFilter !== 'All') {
            result = result.filter(t => t.payment_method?.toLowerCase().includes(methodFilter.toLowerCase()));
        }
        if (categoryFilter !== 'All') {
            result = result.filter(t => t.category?.toLowerCase() === categoryFilter.toLowerCase());
        }
        result.sort((a, b) => new Date(b.transaction_date || '').getTime() - new Date(a.transaction_date || '').getTime());
        return result;
    }, [transactions, period, methodFilter, categoryFilter]);

    const groups = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions]);

    const dropdownOptions = {
        period: [
            { label: 'Any Period', value: 'All' },
            { label: 'Last 7 Days', value: 'Week' },
            { label: 'Last 30 Days', value: 'Month' },
        ],
        method: [
            { label: 'All Methods', value: 'All' },
            { label: 'Card Payment', value: 'Card' },
            { label: 'Cash', value: 'Cash' },
        ],
        category: [
            { label: 'All Categories', value: 'All' },
            { label: 'Food', value: 'Food' },
            { label: 'Shopping', value: 'Shopping' },
            { label: 'Work', value: 'Work' },
            { label: 'Income', value: 'Income' },
        ],
    };

    const activeFilters = [
        {
            id: 'period',
            label: period === 'All' ? 'Period' : period,
            active: period !== 'All',
            onPress: () => setActiveDropdown(activeDropdown === 'period' ? null : 'period')
        },
        {
            id: 'method',
            label: methodFilter === 'All' ? 'Method' : methodFilter,
            active: methodFilter !== 'All',
            onPress: () => setActiveDropdown(activeDropdown === 'method' ? null : 'method')
        },
        {
            id: 'category',
            label: categoryFilter === 'All' ? 'Category' : categoryFilter,
            active: categoryFilter !== 'All',
            onPress: () => setActiveDropdown(activeDropdown === 'category' ? null : 'category')
        },
    ];

    async function fetchTransactions(isPull = false) {
        if (!token) { setIsLoading(false); return; }
        try {
            if (isPull) setIsRefreshing(true); else setIsLoading(true);
            let res = await fetch(`${API_BASE}/transcation`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401) {
                const newToken = await refreshSession();
                if (newToken) res = await fetch(`${API_BASE}/transcation`, { headers: { Authorization: `Bearer ${newToken}` } });
            }
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setTransactions(data.transactions || data || []);
        } catch {
            Toast.show({ type: 'error', text1: 'Sync Error', text2: 'Could not fetch data.' });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }

    useEffect(() => { fetchTransactions(); }, [token]);

    const renderDropdown = () => {
        if (!activeDropdown) return null;
        const options = dropdownOptions[activeDropdown as keyof typeof dropdownOptions];
        const currentVal = activeDropdown === 'period' ? period : activeDropdown === 'method' ? methodFilter : categoryFilter;
        const setter = activeDropdown === 'period' ? setPeriod : activeDropdown === 'method' ? setMethodFilter : setCategoryFilter;

        return (
            <>
                <Pressable style={styles.dropdownBackdrop} onPress={() => setActiveDropdown(null)} />
                <Animated.View
                    entering={FadeInDown.duration(200)}
                    style={[styles.dropdownMenu, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                >
                    {options.map((opt) => (
                        <Pressable
                            key={opt.value}
                            style={[styles.dropdownItem, currentVal === opt.value && { backgroundColor: theme.background }]}
                            onPress={() => {
                                setter(opt.value as any);
                                setActiveDropdown(null);
                            }}
                        >
                            <Text style={[styles.dropdownItemText, { color: theme.text }, currentVal === opt.value && { fontFamily: F.bold }]}>
                                {opt.label}
                            </Text>
                            {currentVal === opt.value && <FontAwesome name="check" size={14} color={theme.accent} />}
                        </Pressable>
                    ))}
                </Animated.View>
            </>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Custom Header */}
            <View style={styles.header}>
                <Pressable style={[styles.headerBtn, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <FontAwesome name="chevron-left" size={12} color={theme.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Transactions</Text>
                <Pressable style={[styles.headerBtn, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <FontAwesome name="search" size={16} color={theme.text} />
                </Pressable>
            </View>

            <View style={{ flex: 1, zIndex: 10 }}>
                {/* Filter Chips */}
                <View style={{ zIndex: 20 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {activeFilters.map((filter) => (
                            <Pressable
                                key={filter.id}
                                onPress={filter.onPress}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: filter.active ? theme.text : theme.surface },
                                    !filter.active && theme.cardShadow
                                ]}
                            >
                                <Text style={[styles.filterText, { color: filter.active ? theme.background : theme.text }]}>
                                    {filter.label}
                                </Text>
                                <FontAwesome
                                    name={activeDropdown === filter.id ? "chevron-up" : "chevron-down"}
                                    size={10}
                                    color={filter.active ? theme.background : theme.subtleText}
                                    style={{ marginLeft: 8 }}
                                />
                            </Pressable>
                        ))}
                    </ScrollView>
                    {renderDropdown()}
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchTransactions(true)} tintColor={theme.text} />
                    }
                >
                    <View style={styles.transactionsContainer}>
                        {isLoading ? (
                            <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
                        ) : groups.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: theme.subtleText }]}>No transactions found</Text>
                            </View>
                        ) : (
                            groups.map((group, groupIdx) => (
                                <Animated.View
                                    key={group.dateKey}
                                    entering={FadeInDown.delay(groupIdx * 100).duration(800)}
                                    style={[styles.dateCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                                >
                                    <View style={styles.dateHeader}>
                                        <View>
                                            <Text style={[styles.headerLabel, { color: theme.subtleText }]}>Date</Text>
                                            <Text style={[styles.dateTitle, { color: theme.text }]}>{group.label}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.headerLabel, { color: theme.subtleText }]}>Total</Text>
                                            <Text style={[styles.dateTotal, { color: theme.text }]}>
                                                {group.total < 0 ? '-' : ''}{fmtCurrency(group.total)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.itemList}>
                                        {group.items.map((item, index) => {
                                            const isIncome = item.category?.toLowerCase() === 'income';
                                            return (
                                                <View key={item.id}>
                                                    {index > 0 && <View style={[styles.separator, { backgroundColor: theme.divider, opacity: 0.3 }]} />}
                                                    <View style={styles.itemRow}>
                                                        <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
                                                            {item.image_address ? (
                                                                <Image source={{ uri: item.image_address }} style={styles.merchantIcon} />
                                                            ) : (
                                                                <FontAwesome
                                                                    name={isIncome ? "arrow-down" : "shopping-bag"}
                                                                    size={20}
                                                                    color={isIncome ? theme.success : theme.subtleText}
                                                                />
                                                            )}
                                                        </View>
                                                        <View style={styles.itemInfo}>
                                                            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                                                            <Text style={[styles.itemTime, { color: theme.subtleText }]}>{fmtTime(item.transaction_date)}</Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                            <Text style={[styles.itemAmount, { color: isIncome ? theme.success : theme.text }]}>
                                                                {isIncome ? '+' : '-'}{fmtCurrency(item.amount)}
                                                            </Text>
                                                            {item.category && item.category !== 'Other' && (
                                                                <View style={[styles.cashbackBadge, { backgroundColor: theme.accent }]}>
                                                                    <Text style={[styles.cashbackText, { color: theme.accentText }]}>{item.category}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </Animated.View>
                            ))
                        )}
                    </View>
                    <View style={{ height: 120 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 24,
    },
    headerBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: F.bold,
    },
    filterScroll: {
        paddingHorizontal: 24,
        gap: 12,
        paddingBottom: 24,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 22,
    },
    filterText: {
        fontSize: 13,
        fontFamily: F.semiBold,
    },
    dropdownBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.02)',
        zIndex: 100,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 60,
        left: 24,
        right: 24,
        borderRadius: 24,
        padding: 12,
        zIndex: 101,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    dropdownItemText: {
        fontSize: 15,
        fontFamily: F.medium,
    },
    transactionsContainer: {
        paddingHorizontal: 18,
        gap: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: F.medium,
    },
    dateCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 20,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerLabel: {
        fontSize: 11,
        fontFamily: F.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
        opacity: 0.7,
    },
    dateTitle: {
        fontSize: 16,
        fontFamily: F.bold,
    },
    dateTotal: {
        fontSize: 16,
        fontFamily: F.bold,
    },
    itemList: {
        gap: 0,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    separator: {
        height: 1,
        width: '100%',
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    merchantIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontFamily: F.bold,
    },
    itemTime: {
        fontSize: 12,
        fontFamily: F.medium,
        marginTop: 2,
    },
    itemAmount: {
        fontSize: 16,
        fontFamily: F.bold,
    },
    cashbackBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    cashbackText: {
        fontSize: 10,
        fontFamily: F.bold,
        textTransform: 'uppercase',
    },
});
