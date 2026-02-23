import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator, TextInput, Dimensions, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { Canvas, Path, Skia, LinearGradient, vec } from '@shopify/react-native-skia';

import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/constants/Config';

const SCREEN_W = Dimensions.get('window').width;

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

// Category colours kept consistent with the badge colours in the list
const CAT_COLORS: Record<string, string> = {
    Food: '#FF6B6B',
    Travel: '#4ECDC4',
    Shopping: '#FFE66D',
    Bills: '#A8E6CF',
    Entertainment: '#C3A6FF',
    Health: '#FFA07A',
    Transfer: '#87CEEB',
    Income: '#00C48C',
    Investment: '#FFB347',
    Other: '#B0B0B0',
};

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

function fmtINR(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Category donut chart (Skia) ───────────────────────────────────────────────
function DonutChart({ data, size, theme }: {
    data: { label: string; value: number; color: string }[];
    size: number;
    theme: any;
}) {
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 10;
    const innerR = outerR * 0.58;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;

    const segments: { path: any; color: string }[] = [];
    let startAngle = -Math.PI / 2;

    for (const d of data) {
        const sweep = (d.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sweep;
        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        const large = sweep > Math.PI ? 1 : 0;

        const path = Skia.Path.Make();
        path.moveTo(x1, y1);
        path.arcToOval(
            { x: cx - outerR, y: cy - outerR, width: outerR * 2, height: outerR * 2 },
            (startAngle * 180) / Math.PI,
            (sweep * 180) / Math.PI,
            false
        );
        path.lineTo(ix1, iy1);
        path.arcToOval(
            { x: cx - innerR, y: cy - innerR, width: innerR * 2, height: innerR * 2 },
            (endAngle * 180) / Math.PI,
            -(sweep * 180) / Math.PI,
            false
        );
        path.close();

        segments.push({ path, color: d.color });
        startAngle = endAngle;
    }

    return (
        <Canvas style={{ width: size, height: size }}>
            {segments.map((seg, i) => (
                <Path key={i} path={seg.path} color={seg.color} style="fill" />
            ))}
        </Canvas>
    );
}

// ── Interactive scrubbing area chart ───────────────────────────────────────────
function WeeklyLine({ groups, theme }: { groups: DayGroup[]; theme: any }) {
    const W = SCREEN_W - 80;
    const H = 120;
    const PAD_X = 12;
    const PAD_Y = 14;
    const plotW = W - PAD_X * 2;
    const plotH = H - PAD_Y * 2;

    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    // 7-day dataset
    const days = useMemo(() => {
        const result: { label: string; fullLabel: string; spend: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });
            const fullLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const grp = groups.find(g => g.dateKey === key);
            result.push({ label, fullLabel, spend: grp ? Math.abs(grp.total) : 0 });
        }
        return result;
    }, [groups]);

    const maxSpend = Math.max(...days.map(d => d.spend), 1);
    const n = days.length;

    // Canvas points
    const pts = useMemo(() => days.map((d, i) => ({
        x: PAD_X + (i / (n - 1)) * plotW,
        y: PAD_Y + plotH - (d.spend / maxSpend) * plotH,
    })), [days, maxSpend, n, plotW, plotH]);

    // Static paths (area fill + stroke line)
    const { linePath, areaPath } = useMemo(() => {
        const line = Skia.Path.Make();
        line.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
            const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
            const cp1y = pts[i].y;
            const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) / 3;
            const cp2y = pts[i + 1].y;
            line.cubicTo(cp1x, cp1y, cp2x, cp2y, pts[i + 1].x, pts[i + 1].y);
        }
        const area = line.copy();
        area.lineTo(pts[n - 1].x, H);
        area.lineTo(pts[0].x, H);
        area.close();
        return { linePath: line, areaPath: area };
    }, [pts, n, H]);

    const accent = theme.accent ?? '#00C48C';
    const displayIdx = activeIdx ?? n - 1;
    const activePt = pts[displayIdx];
    const isTouch = activeIdx !== null;

    // Dynamic: crosshair + dot paths (recompute only when activePt changes)
    const crosshairPath = useMemo(() => {
        const p = Skia.Path.Make();
        // dashed vertical line via short segments
        const segLen = 6, gap = 4;
        let y = PAD_Y;
        while (y < H) {
            p.moveTo(activePt.x, y);
            p.lineTo(activePt.x, Math.min(y + segLen, H));
            y += segLen + gap;
        }
        return p;
    }, [activePt, PAD_Y, H]);

    const outerDot = useMemo(() => Skia.Path.Make().addCircle(activePt.x, activePt.y, 10), [activePt]);
    const innerDot = useMemo(() => Skia.Path.Make().addCircle(activePt.x, activePt.y, 5), [activePt]);
    const centDot = useMemo(() => Skia.Path.Make().addCircle(activePt.x, activePt.y, 2), [activePt]);

    // Snap to nearest point on touch
    const snapToX = useCallback((x: number) => {
        let nearest = 0, minDist = Infinity;
        pts.forEach((pt, i) => { const d = Math.abs(pt.x - x); if (d < minDist) { minDist = d; nearest = i; } });
        setActiveIdx(nearest);
    }, [pts]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => snapToX(e.nativeEvent.locationX),
            onPanResponderMove: (e) => snapToX(e.nativeEvent.locationX),
            onPanResponderRelease: () => setActiveIdx(null),
            onPanResponderTerminate: () => setActiveIdx(null),
        })
    ).current;

    // Tooltip left clamped so it never clips the card edges
    const tooltipW = 120;
    const tooltipLeft = Math.max(0, Math.min(activePt.x - tooltipW / 2, W - tooltipW));

    return (
        <View style={{ width: W, paddingTop: 4 }}>
            {/* Floating tooltip */}
            <View style={[
                lineStyles.tooltip,
                {
                    left: tooltipLeft,
                    backgroundColor: isTouch ? theme.surface : 'transparent',
                    borderColor: isTouch ? (theme.divider ?? '#E0E0E0') : 'transparent',
                    opacity: isTouch ? 1 : 0,
                },
            ]}>
                <Text style={[lineStyles.tooltipDay, { color: theme.subtleText }]}>
                    {days[displayIdx].fullLabel}
                </Text>
                <Text style={[lineStyles.tooltipAmount, { color: accent }]}>
                    {fmtINR(days[displayIdx].spend)}
                </Text>
            </View>

            {/* Touch layer + Canvas */}
            <View {...panResponder.panHandlers}>
                <Canvas style={{ width: W, height: H }}>
                    {/* Area gradient fill */}
                    <Path path={areaPath} style="fill" color="transparent">
                        <LinearGradient
                            start={vec(0, PAD_Y)}
                            end={vec(0, H)}
                            colors={[accent + '44', accent + '00']}
                        />
                    </Path>

                    {/* Stroke line */}
                    <Path
                        path={linePath}
                        style="stroke"
                        strokeWidth={2.5}
                        strokeCap="round"
                        strokeJoin="round"
                        color={accent}
                    />

                    {/* Dashed crosshair – only when touching */}
                    {isTouch && (
                        <Path
                            path={crosshairPath}
                            style="stroke"
                            strokeWidth={1.2}
                            color={accent + '88'}
                        />
                    )}

                    {/* Glow ring */}
                    <Path path={outerDot} color={isTouch ? accent + '40' : accent + '22'} style="fill" />
                    {/* Filled dot */}
                    <Path path={innerDot} color={accent} style="fill" />
                    {/* White centre */}
                    <Path path={centDot} color="white" style="fill" />
                </Canvas>
            </View>

            {/* Day labels – bold when active */}
            <View style={{ flexDirection: 'row', width: W, marginTop: 2 }}>
                {days.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                            fontSize: 10,
                            fontFamily: i === displayIdx ? F.bold : F.medium,
                            color: i === displayIdx ? accent : (theme.subtleText ?? '#888'),
                            opacity: i === displayIdx ? 1 : 0.5,
                        }}>{d.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const lineStyles = StyleSheet.create({
    tooltip: {
        position: 'absolute',
        top: -44,
        width: 120,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
        zIndex: 10,
    },
    tooltipDay: {
        fontSize: 10,
        fontFamily: F.medium,
        marginBottom: 1,
    },
    tooltipAmount: {
        fontSize: 14,
        fontFamily: F.bold,
    },
});


// ── Charts section component ──────────────────────────────────────────────────
function ChartsSection({ transactions, groups, theme }: {
    transactions: Transaction[];
    groups: DayGroup[];
    theme: any;
}) {
    const catTotals = useMemo(() => {
        const map: Record<string, number> = {};
        for (const t of transactions) {
            if (t.category?.toLowerCase() === 'income') continue;
            const cat = t.category || 'Other';
            map[cat] = (map[cat] || 0) + t.amount;
        }
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([label, value]) => ({ label, value, color: CAT_COLORS[label] ?? '#B0B0B0' }));
    }, [transactions]);

    const total = catTotals.reduce((s, d) => s + d.value, 0);

    const DONUT = 140;

    return (
        <View style={[chartStyles.card, { backgroundColor: theme.surface, ...(theme.cardShadow ?? {}) }]}>
            {/* ── Weekly bar chart ── */}
            <Text style={[chartStyles.cardTitle, { color: theme.text }]}>This Week</Text>
            <WeeklyLine groups={groups} theme={theme} />

            {/* ── Category donut ── */}
            <View style={chartStyles.divider} />
            <Text style={[chartStyles.cardTitle, { color: theme.text }]}>By Category</Text>

            {catTotals.length === 0 ? (
                <Text style={[chartStyles.emptyNote, { color: theme.subtleText }]}>No data yet</Text>
            ) : (
                <View style={chartStyles.donutRow}>
                    <DonutChart data={catTotals} size={DONUT} theme={theme} />
                    <View style={chartStyles.legend}>
                        {catTotals.map(d => (
                            <View key={d.label} style={chartStyles.legendRow}>
                                <View style={[chartStyles.legendDot, { backgroundColor: d.color }]} />
                                <Text style={[chartStyles.legendLabel, { color: theme.text }]}>{d.label}</Text>
                                <Text style={[chartStyles.legendPct, { color: theme.subtleText }]}>
                                    {Math.round((d.value / total) * 100)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const chartStyles = StyleSheet.create({
    card: {
        marginHorizontal: 18,
        marginBottom: 20,
        borderRadius: 32,
        padding: 24,
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: F.bold,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.07)',
        marginVertical: 20,
    },
    donutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    legend: {
        flex: 1,
        gap: 8,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: 13,
        fontFamily: F.medium,
    },
    legendPct: {
        fontSize: 12,
        fontFamily: F.bold,
    },
    emptyNote: {
        fontSize: 14,
        fontFamily: F.medium,
        textAlign: 'center',
        opacity: 0.5,
        paddingVertical: 12,
    },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function TransferScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { token, refreshSession } = useAuth();
    const router = useRouter();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

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
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.category?.toLowerCase().includes(q) ||
                t.note?.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => new Date(b.transaction_date || '').getTime() - new Date(a.transaction_date || '').getTime());
        return result;
    }, [transactions, period, methodFilter, categoryFilter, searchQuery]);

    const groups = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions]);
    // For charts we always use ALL transactions (not filtered) so charts are accurate
    const allGroups = useMemo(() => groupByDay(transactions), [transactions]);

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
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.headerBtn, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                >
                    <FontAwesome name="chevron-left" size={12} color={theme.text} />
                </Pressable>

                {isSearchVisible ? (
                    <View style={[styles.searchContainer, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <TextInput
                            autoFocus
                            placeholder="Search..."
                            placeholderTextColor={theme.subtleText}
                            style={[styles.searchInput, { color: theme.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <Pressable onPress={() => { setIsSearchVisible(false); setSearchQuery(''); }}>
                            <FontAwesome name="times-circle" size={18} color={theme.subtleText} />
                        </Pressable>
                    </View>
                ) : (
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Transactions</Text>
                )}

                <Pressable
                    onPress={() => setIsSearchVisible(!isSearchVisible)}
                    style={[styles.headerBtn, { backgroundColor: theme.surface, ...theme.cardShadow }]}
                >
                    <FontAwesome name={isSearchVisible ? "close" : "search"} size={16} color={theme.text} />
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
                    {/* ── CHARTS ── */}
                    {!isLoading && transactions.length > 0 && (
                        <ChartsSection
                            transactions={transactions}
                            groups={allGroups}
                            theme={theme}
                        />
                    )}

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
                                                {group.total < 0 ? '-' : ''}{fmtINR(group.total)}
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
                                                                {isIncome ? '+' : '-'}{fmtINR(item.amount)}
                                                            </Text>
                                                            {item.category && item.category !== 'Other' && (
                                                                <View style={[styles.cashbackBadge, { backgroundColor: CAT_COLORS[item.category] ?? theme.accent }]}>
                                                                    <Text style={[styles.cashbackText, { color: '#fff' }]}>{item.category}</Text>
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
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 16,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: F.medium,
        padding: 0,
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
