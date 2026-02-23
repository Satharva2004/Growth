
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    StyleSheet, ScrollView, Pressable, RefreshControl,
    View, Text, TextInput, Image, Platform, ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';
import { useSmsTransactionHandler } from '@/utils/smsReader';
import {
    cacheTransactions,
    loadCachedTransactions,
    getPendingQueue,
    removeSyncedFromQueue,
    addToPendingQueue,
    isSmsProcessed,
    markSmsAsProcessed,
} from '@/utils/offlineStorage';

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
    reference_id?: string;
    createdAt?: string;
    _localPending?: boolean; // flag for offline-queued transactions
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
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [balanceHidden, setBalanceHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Today's spend calculation using local time boundary
    const todayKey = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const todaySpend = useMemo(() => {
        return transactions
            .filter(t => {
                const d = t.transaction_date ? new Date(t.transaction_date) : new Date();
                return d.toLocaleDateString('en-CA') === todayKey
                    && t.category?.toLowerCase() !== 'income';
            })
            .reduce((s, t) => s + t.amount, 0);
    }, [transactions, todayKey]);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.note?.toLowerCase().includes(q)
        );
    }, [transactions, searchQuery]);

    const groups = useMemo(() => groupByDay(filtered), [filtered]);

    // Load cached transactions immediately (offline-first)
    useEffect(() => {
        const boot = async () => {
            const cached = await loadCachedTransactions();
            if (cached.length > 0) {
                setTransactions(cached);
                setIsLoading(false);
            }
        };
        boot();
    }, []);

    useEffect(() => { fetchTransactions(); }, [token]);

    async function fetchTransactions(isPull = false) {
        if (!token) { setIsLoading(false); setIsRefreshing(false); return; }
        try {
            if (isPull) setIsRefreshing(true); else setIsLoading(true);
            let res = await fetch(`${API_BASE}/transcation`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                const nt = await refreshSession();
                if (nt) res = await fetch(`${API_BASE}/transcation`, { headers: { Authorization: `Bearer ${nt}` } });
            }
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            const txns: Transaction[] = data.transactions || data || [];
            setTransactions(txns);
            setIsOffline(false);
            await cacheTransactions(txns); // persist for offline use
        } catch {
            setIsOffline(true);
            // Use whatever we have in state (which already loaded from cache on boot)
            const cached = await loadCachedTransactions();
            if (cached.length > 0) setTransactions(cached);
            if (isPull) Toast.show({ type: 'error', text1: 'Offline', text2: 'Showing cached data.' });
        } finally { setIsLoading(false); setIsRefreshing(false); }
    }

    // ── Sync missed SMS transactions ─────────────────────────────────────────
    const handleSync = async () => {
        if (isSyncing) return;
        if (!token) {
            Toast.show({ type: 'error', text1: 'Not logged in', text2: 'Please log in to sync.' });
            return;
        }

        setIsSyncing(true);
        Toast.show({ type: 'info', text1: '🔄 Syncing…', text2: 'Reading recent transaction SMS…' });

        try {
            // ── Step 1: Flush pending queue ───────────────────────────────────
            const pending = await getPendingQueue();
            let flushedCount = 0;
            const flushedTimestamps: number[] = [];

            for (const item of pending) {
                try {
                    const PendingTxService = require('@/utils/transactionService').default;
                    await PendingTxService.createTransaction(token, item);
                    flushedTimestamps.push(item._queued_at);
                    flushedCount++;
                } catch (e: any) {
                    console.warn('[Sync] Could not flush item:', e.message);
                }
            }
            if (flushedTimestamps.length) await removeSyncedFromQueue(flushedTimestamps);

            // ── Step 2: Pull SMS inbox and parse new transactions ─────────────
            const SmsService = require('@/utils/smsService').default;
            const { parseWithGroq } = require('@/utils/groqService');
            const TransactionService = require('@/utils/transactionService').default;

            // Throttle: ~600ms between calls keeps us under 12K TPM
            const INTER_REQUEST_DELAY_MS = 600;
            // Cap per sync run so one tap can't exhaust the daily quota
            const MAX_SMS_PER_SYNC = 30;

            // Fetch last 7 days of candidate transaction SMS
            const allSmsList = await SmsService.getTransactionSms(7);
            console.log(`[Sync] Found ${allSmsList.length} candidate SMS in inbox`);

            // Pre-filter: remove ones already processed (no Groq call needed)
            const unprocessed: typeof allSmsList = [];
            for (const sms of allSmsList) {
                const fp = `sync_${sms.address}_${sms.date}_${(sms.body || '').slice(0, 40)}`;
                const done = await isSmsProcessed(fp);
                if (!done) unprocessed.push(sms);
            }

            // Take the MAX_SMS_PER_SYNC most-recent unprocessed messages
            const smsList = unprocessed.slice(0, MAX_SMS_PER_SYNC);
            console.log(`[Sync] Processing ${smsList.length} unprocessed SMS (capped at ${MAX_SMS_PER_SYNC})`);

            // Fetch server transactions to cross-check duplicates
            let serverTxns: Transaction[] = [];
            try {
                const r = await fetch(`${API_BASE}/transcation`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const d = await r.json();
                serverTxns = d.transactions || d || [];
            } catch (_) { /* use empty if offline */ }

            // Build dedup sets from what's already on the server
            const existingRefs = new Set(
                serverTxns.filter(t => t.reference_id).map(t => t.reference_id!.toLowerCase())
            );
            const existingAmountDate = new Set(
                serverTxns.map(t => `${t.amount}_${(t.transaction_date || '').slice(0, 10)}`)
            );

            let newCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < smsList.length; i++) {
                const sms = smsList[i];
                const fingerprint = `sync_${sms.address}_${sms.date}_${(sms.body || '').slice(0, 40)}`;

                // ── Rate-limit guard: wait between Groq calls ─────────────────
                if (i > 0) await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));

                // Update toast so user sees progress
                Toast.show({
                    type: 'info',
                    text1: `🔄 Parsing SMS ${i + 1} / ${smsList.length}`,
                    text2: 'Analysing with AI…',
                });

                let parsed;
                try {
                    parsed = await parseWithGroq(sms.body, sms.address);
                } catch (_) {
                    await markSmsAsProcessed(fingerprint);
                    continue;
                }

                if (!parsed || !parsed.amount) {
                    await markSmsAsProcessed(fingerprint);
                    continue;
                }

                // Check reference_id dedup
                if (parsed.reference_id && existingRefs.has(parsed.reference_id.toLowerCase())) {
                    console.log('[Sync] Skipping duplicate ref_id:', parsed.reference_id);
                    await markSmsAsProcessed(fingerprint);
                    skippedCount++;
                    continue;
                }

                // Check amount+date dedup (fallback)
                const dateKey = (parsed.transaction_date || new Date(sms.date).toISOString()).slice(0, 10);
                const amountDateKey = `${parsed.amount}_${dateKey}`;
                if (existingAmountDate.has(amountDateKey)) {
                    console.log('[Sync] Skipping duplicate amount+date:', amountDateKey);
                    await markSmsAsProcessed(fingerprint);
                    skippedCount++;
                    continue;
                }

                // Create transaction on server
                try {
                    const newTxn = await TransactionService.createTransaction(token, {
                        name: parsed.name || 'Unknown Purchase',
                        amount: parsed.amount,
                        category: parsed.category || 'Other',
                        note: 'Synced from SMS',
                        is_auto: true,
                        transaction_date: parsed.transaction_date || new Date(sms.date).toISOString(),
                        merchant_domain: parsed.merchant_domain,
                        image_address: parsed.image_address,
                        reference_id: parsed.reference_id,
                    });

                    existingRefs.add((parsed.reference_id || '').toLowerCase());
                    existingAmountDate.add(amountDateKey);
                    await markSmsAsProcessed(fingerprint);
                    newCount++;
                    console.log('[Sync] Created:', newTxn?.id || newTxn?._id, parsed.name);
                } catch (err: any) {
                    console.warn('[Sync] Failed to create:', err.message);
                }
            }

            // ── Step 3: Refresh local list ────────────────────────────────────
            await fetchTransactions();

            const msg = newCount > 0
                ? `Added ${newCount} new transaction${newCount > 1 ? 's' : ''}.${flushedCount > 0 ? ` Flushed ${flushedCount} queued.` : ''}`
                : flushedCount > 0
                    ? `Flushed ${flushedCount} queued transaction${flushedCount > 1 ? 's' : ''}.`
                    : 'Everything is already up to date!';

            Toast.show({ type: 'success', text1: '✅ Sync Complete', text2: msg });
        } catch (err: any) {
            console.error('[Sync] Error:', err);
            Toast.show({ type: 'error', text1: 'Sync Failed', text2: err.message || 'Try again.' });
        } finally {
            setIsSyncing(false);
        }
    };

    // ── Foreground SMS handler ────────────────────────────────────────────────
    const handleSms = useCallback((payload: any) => {
        if (!payload) return;
        const d = payload.parsed || payload;
        if (!d.amount) return;

        const t: Transaction = {
            id: `sms-${Date.now()}`,
            name: d.name || d.vendor || 'Unknown',
            amount: typeof d.amount === 'number' ? d.amount : 0,
            category: d.category || 'Other',
            transaction_date: d.transaction_date || new Date().toISOString(),
            is_auto: true,
            payment_method: d.payment_method,
            source: 'sms',
            image_address: d.image_address || null,
            reference_id: d.reference_id,
        };

        // Optimistic UI update (the _layout will create on server)
        setTransactions(p => {
            // Avoid duplicating if reference_id matches
            if (t.reference_id && p.some(x => x.reference_id === t.reference_id)) return p;
            return [t, ...p];
        });
        Toast.show({ type: 'success', text1: '📩 SMS Detected', text2: `₹${t.amount} at ${t.name}` });
    }, []);

    useSmsTransactionHandler({ enabled: !!token, onTransaction: handleSms });

    const firstName = user?.name?.split(' ')[0] || 'there';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>

            {/* ── TOP BAR ── */}
            <View style={styles.topBar}>
                <View>
                    <Text style={[styles.greeting, { color: theme.text }]}>Good {getHour()}, {firstName}</Text>
                    <View style={styles.greetRow}>
                        <Text style={[styles.greetSub, { color: theme.subtleText }]}>Welcome to Clarity</Text>
                        {isOffline && (
                            <View style={[styles.offlineBadge, { backgroundColor: theme.error + '22' }]}>
                                <FontAwesome name="wifi" size={9} color={theme.error} />
                                <Text style={[styles.offlineTxt, { color: theme.error }]}>Offline</Text>
                            </View>
                        )}
                    </View>
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
                        <Text style={[styles.balanceLabel, { color: theme.subtleText }]}>Today's spend</Text>
                        <Pressable onPress={() => setBalanceHidden(h => !h)}>
                            <FontAwesome name={balanceHidden ? 'eye-slash' : 'eye'} size={17} color={theme.subtleText} />
                        </Pressable>
                    </View>
                    <Text style={[styles.balanceAmount, { color: theme.text }]}>
                        {balanceHidden ? '••••••' : fmtINR(todaySpend)}
                    </Text>

                    {/* Action buttons row */}
                    <View style={styles.cardActions}>
                        <Pressable
                            style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1, flex: 1.5 }]}
                            onPress={() => router.push('/transactions/create')}
                        >
                            <Text style={[styles.addBtnText, { color: theme.primaryText }]}>Add Transaction</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.voiceQuickBtn,
                                {
                                    backgroundColor: theme.accent,
                                    opacity: pressed ? 0.8 : 1,
                                    marginHorizontal: 8,
                                }
                            ]}
                            onPress={() => router.push({ pathname: '/transactions/create', params: { autoVoice: 'true' } })}
                        >
                            <MaterialCommunityIcons name="waveform" size={20} color={theme.accentText} />
                        </Pressable>

                        {/* ── SYNC BUTTON ── */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.syncBtn,
                                {
                                    backgroundColor: isSyncing ? theme.surface : theme.surface,
                                    borderColor: theme.divider,
                                    borderWidth: 1,
                                    opacity: pressed ? 0.8 : 1,
                                }
                            ]}
                            onPress={handleSync}
                            disabled={isSyncing}
                        >
                            {isSyncing
                                ? <ActivityIndicator size="small" color={theme.subtleText} />
                                : <FontAwesome name="refresh" size={16} color={theme.text} />
                            }
                        </Pressable>
                    </View>
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
                                Tap "Add Transaction" or press the sync button to import from SMS.
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
                                                <View style={styles.txnNameRow}>
                                                    <Text style={[styles.txnName, { color: theme.text }]} numberOfLines={1}>{txn.name}</Text>
                                                    {txn._localPending && (
                                                        <View style={[styles.pendingDot, { backgroundColor: '#f59e0b' }]} />
                                                    )}
                                                </View>
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
    greetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    greetSub: { fontSize: 13, fontFamily: F.regular },
    offlineBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
    },
    offlineTxt: { fontSize: 10, fontFamily: F.medium },
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
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' },
    addBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
    addBtnText: { fontSize: 15, fontFamily: F.semiBold },
    syncBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceQuickBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },

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
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14, overflow: 'hidden',
    },
    txnLogoImg: { width: '100%', height: '100%' },
    txnLogoChar: { fontSize: 18, fontFamily: F.bold },
    txnInfo: { flex: 1, gap: 4 },
    txnNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txnName: { fontSize: 14, fontFamily: F.semiBold, flex: 1 },
    pendingDot: { width: 6, height: 6, borderRadius: 3 },
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
