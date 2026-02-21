
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    StyleSheet, ScrollView, Pressable, RefreshControl,
    View, Text, TextInput, Image, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';
import { useSmsTransactionHandler } from '@/utils/smsReader';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

interface Transaction {
    id: string;
    name: string;
    amount: number;
    category?: string;
    transaction_date?: string;
    note?: string;
    is_auto?: boolean;
    payment_method?: string;
    source?: string;
    image_address?: string | null;
    createdAt?: string;
}

interface DayGroup {
    label: string;        // "October 17, Thu"
    dateKey: string;      // "2024-10-17"
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
        g.total += t.category?.toLowerCase() === 'income' ? 0 : -t.amount;
        g.items.push(t);
    }
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function fmtTime(dateStr?: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtINR(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getHour() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}

export default function TransactionsScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { token, user, refreshSession } = useAuth();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [balanceHidden, setBalanceHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const totalSpend = useMemo(
        () => transactions.reduce((s, t) => t.category?.toLowerCase() === 'income' ? s : s + t.amount, 0),
        [transactions]
    );

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(t => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
    }, [transactions, searchQuery]);

    const groups = useMemo(() => groupByDay(filtered), [filtered]);

    useEffect(() => { fetchTransactions(); }, [token]);

    async function fetchTransactions(isPull = false) {
        if (!token) { setIsLoading(false); setIsRefreshing(false); return; }
        try {
            if (isPull) setIsRefreshing(true); else setIsLoading(true);
            let res = await fetch(`${API_BASE}/transcation`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401) {
                const nt = await refreshSession();
                if (nt) res = await fetch(`${API_BASE}/transcation`, { headers: { Authorization: `Bearer ${nt}` } });
            }
            if (!res.ok) throw new Error();
            const data = await res.json();
            setTransactions(data.transactions || data || []);
        } catch {
            Toast.show({ type: 'error', text1: 'Offline', text2: 'Could not sync.' });
        } finally { setIsLoading(false); setIsRefreshing(false); }
    }

    const handleSms = useCallback((payload: any) => {
        if (!payload) return;
        const d = payload.parsed || payload;
        const t: Transaction = {
            id: `sms-${Date.now()}`, name: d.name || d.vendor || 'Unknown',
            amount: typeof d.amount === 'number' ? d.amount : 0,
            category: d.category || 'Other', transaction_date: d.transaction_date || new Date().toISOString(),
            is_auto: true, payment_method: d.payment_method, source: 'sms', image_address: d.image_address || null,
        };
        setTransactions(p => [t, ...p]);
        Toast.show({ type: 'success', text1: 'SMS Detected', text2: 'Auto-added' });
    }, []);

    useSmsTransactionHandler({ enabled: !!token, onTransaction: handleSms });

    const firstName = user?.name?.split(' ')[0] || 'there';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>

            {/* ── TOP BAR ── */}
            <View style={styles.topBar}>
                <View>
                    <Text style={[styles.greeting, { color: theme.text }]}>Good {getHour()}, {firstName}</Text>
                    <Text style={[styles.greetSub, { color: theme.subtleText }]}>Welcome to Clarity</Text>
                </View>
                <Pressable onPress={() => router.push('/profile')}
                    style={[styles.avatarCircle, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    {user?.photo
                        ? <Image source={{ uri: user.photo }} style={styles.avatarImg} />
                        : <View style={[styles.avatarInner, { backgroundColor: theme.accent }]}>
                            <Text style={[styles.avatarInit, { color: theme.accentText }]}>{firstName[0]?.toUpperCase()}</Text>
                        </View>
                    }
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchTransactions(true)} tintColor={theme.text} />}
            >
                {/* ── BALANCE CARD ── */}
                <View style={[styles.balanceCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <View style={styles.balanceTop}>
                        <Text style={[styles.balanceLabel, { color: theme.subtleText }]}>Your balance</Text>
                        <Pressable onPress={() => setBalanceHidden(h => !h)}>
                            <FontAwesome name={balanceHidden ? 'eye-slash' : 'eye'} size={17} color={theme.subtleText} />
                        </Pressable>
                    </View>
                    <Text style={[styles.balanceAmount, { color: theme.text }]}>
                        {balanceHidden ? '••••••' : fmtINR(totalSpend)}
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
                        onPress={() => router.push('/transactions/create')}
                    >
                        <Text style={[styles.addBtnText, { color: theme.primaryText }]}>Add Transaction</Text>
                    </Pressable>
                </View>

                {/* ── SECTION HEADER ── */}
                <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Transactions</Text>
                    <View style={[styles.searchBar, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <FontAwesome name="search" size={13} color={theme.subtleText} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder="Search..."
                            placeholderTextColor={theme.inputPlaceholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* ── LIST ── */}
                {isLoading ? (
                    <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 48 }} />
                ) : groups.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <View style={[styles.emptyBox, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                            <FontAwesome name="inbox" size={36} color={theme.subtleText} />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions yet</Text>
                            <Text style={[styles.emptySub, { color: theme.subtleText }]}>
                                Tap "Add Transaction" or we'll auto-detect from SMS.
                            </Text>
                        </View>
                    </View>
                ) : (
                    groups.map(group => (
                        <View key={group.dateKey} style={[styles.dayCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                            {/* Day header */}
                            <View style={styles.dayHeader}>
                                <Text style={[styles.dayLabel, { color: theme.subtleText }]}>Date</Text>
                                <Text style={[styles.dayLabel, { color: theme.subtleText }]}>Total</Text>
                            </View>
                            <View style={styles.dayTitleRow}>
                                <Text style={[styles.dayTitle, { color: theme.text }]}>{group.label}</Text>
                                <Text style={[styles.dayTotal, { color: theme.text }]}>
                                    {group.total >= 0 ? '-' : '+'}{fmtINR(group.total)}
                                </Text>
                            </View>

                            <View style={[styles.daySep, { backgroundColor: theme.divider }]} />

                            {/* Transactions */}
                            {group.items.map((txn, i) => {
                                const isIncome = txn.category?.toLowerCase() === 'income';
                                return (
                                    <View key={txn.id}>
                                        {i > 0 && <View style={[styles.txnSep, { backgroundColor: theme.background }]} />}
                                        <Pressable
                                            style={({ pressed }) => [styles.txnRow, { opacity: pressed ? 0.8 : 1 }]}
                                            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: txn.id } })}
                                        >
                                            {/* Logo circle */}
                                            <View style={[styles.txnLogo, { backgroundColor: theme.accent }]}>
                                                {txn.image_address
                                                    ? <Image source={{ uri: txn.image_address }} style={styles.txnLogoImg} />
                                                    : <Text style={[styles.txnLogoChar, { color: theme.accentText }]}>
                                                        {txn.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </Text>
                                                }
                                            </View>

                                            {/* Info */}
                                            <View style={styles.txnInfo}>
                                                <Text style={[styles.txnName, { color: theme.text }]} numberOfLines={1}>{txn.name}</Text>
                                                <View style={styles.txnMetaRow}>
                                                    <Text style={[styles.txnTime, { color: theme.subtleText }]}>{fmtTime(txn.transaction_date)}</Text>
                                                    {txn.category ? (
                                                        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                                            <Text style={[styles.badgeText, { color: theme.accentText }]}>{txn.category}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {/* Amount */}
                                            <Text style={[styles.txnAmount, { color: isIncome ? theme.positive : theme.text }]}>
                                                {isIncome ? '+' : '-'}{fmtINR(txn.amount)}
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 22, paddingTop: 10, paddingBottom: 18,
    },
    greeting: { fontSize: 22, fontFamily: F.bold, letterSpacing: -0.4 },
    greetSub: { fontSize: 13, fontFamily: F.regular, marginTop: 2 },
    avatarCircle: {
        width: 42, height: 42, borderRadius: 21,
        overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    avatarInit: { fontSize: 17, fontFamily: F.bold },

    scroll: { paddingHorizontal: 18, gap: 16 },

    // Balance card
    balanceCard: { borderRadius: 20, padding: 24, gap: 10 },
    balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceLabel: { fontSize: 13, fontFamily: F.medium },
    balanceAmount: { fontSize: 40, fontFamily: F.bold, letterSpacing: -1.5 },
    addBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    addBtnText: { fontSize: 15, fontFamily: F.semiBold },

    // Section row with search
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    sectionTitle: { fontSize: 20, fontFamily: F.bold, flexShrink: 0 },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, height: 40, borderRadius: 20,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: F.regular },

    // Day card
    dayCard: { borderRadius: 20, padding: 18, gap: 0 },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    dayLabel: { fontSize: 11, fontFamily: F.medium, textTransform: 'uppercase', letterSpacing: 0.4 },
    dayTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 14 },
    dayTitle: { fontSize: 15, fontFamily: F.bold },
    dayTotal: { fontSize: 15, fontFamily: F.bold },
    daySep: { height: 1, marginBottom: 6 },

    // Transaction row
    txnSep: { height: 8 },
    txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    txnLogo: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14, overflow: 'hidden',
    },
    txnLogoImg: { width: '100%', height: '100%' },
    txnLogoChar: { fontSize: 18, fontFamily: F.bold },
    txnInfo: { flex: 1, gap: 4 },
    txnName: { fontSize: 14, fontFamily: F.semiBold },
    txnMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txnTime: { fontSize: 12, fontFamily: F.regular },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
    badgeText: { fontSize: 10, fontFamily: F.bold },
    txnAmount: { fontSize: 14, fontFamily: F.bold, marginLeft: 8 },

    // Empty
    emptyWrap: { paddingVertical: 20 },
    emptyBox: { borderRadius: 20, padding: 36, alignItems: 'center', gap: 12 },
    emptyTitle: { fontSize: 17, fontFamily: F.bold },
    emptySub: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },
});
