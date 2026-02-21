
import { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfileScreen() {
    const { toggleTheme } = useTheme();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { logout, user } = useAuth();

    const displayName = useMemo(() => {
        if (user?.name) return user.name;
        if (user?.email) return user.email.split('@')[0];
        return 'User';
    }, [user]);

    const initials = useMemo(() => {
        const parts = displayName.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return displayName.slice(0, 2).toUpperCase();
    }, [displayName]);

    async function handleLogout() {
        Toast.show({ type: 'success', text1: 'Logged Out', text2: 'See you soon!' });
        await logout();
        router.replace('/login');
    }

    const personalRows: { icon: React.ComponentProps<typeof FontAwesome>['name']; label: string; value: string }[] = [
        { icon: 'user-o', label: 'Name', value: displayName },
        { icon: 'envelope-o', label: 'E-mail', value: user?.email || '—' },
    ];

    const accountRows: { icon: React.ComponentProps<typeof FontAwesome>['name']; label: string; sublabel?: string; onPress: () => void; danger?: boolean }[] = [
        {
            icon: 'sign-out',
            label: 'Log Out',
            onPress: handleLogout,
            danger: true,
        },
    ];

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Title */}
                <Text style={[styles.pageTitle, { color: theme.text }]}>Profile</Text>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarFrame, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        {user?.photo && typeof user.photo === 'string' && user.photo.startsWith('http')
                            ? <Image
                                source={{ uri: user.photo }}
                                style={styles.avatarImg}
                                resizeMode="cover"
                            />
                            : <View style={[styles.avatarBg, { backgroundColor: theme.accent }]}>
                                <Text style={[styles.avatarInitials, { color: theme.accentText }]}>{initials}</Text>
                            </View>
                        }
                    </View>
                    {/* Pencil edit */}
                    <View style={[styles.editBadge, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <FontAwesome name="pencil" size={11} color={theme.subtleText} />
                    </View>
                </View>

                {/* Personal info */}
                <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <View style={styles.cardHead}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Personal info</Text>
                        <Pressable><Text style={[styles.editBtn, { color: theme.text }]}>Edit</Text></Pressable>
                    </View>
                    {personalRows.map((row, i) => (
                        <View key={row.label}>
                            {i > 0 && <View style={[styles.sep, { backgroundColor: theme.divider }]} />}
                            <View style={styles.infoRow}>
                                <FontAwesome name={row.icon} size={14} color={theme.subtleText} style={styles.infoIcon} />
                                <View>
                                    <Text style={[styles.infoLabel, { color: theme.subtleText }]}>{row.label}</Text>
                                    <Text style={[styles.infoValue, { color: theme.text }]}>{row.value}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Account info */}
                <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                    <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 10 }]}>Account info</Text>
                    {accountRows.map((item, i) => (
                        <View key={item.label}>
                            {i > 0 && <View style={[styles.sep, { backgroundColor: theme.divider }]} />}
                            <Pressable
                                style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                                onPress={item.onPress}
                            >
                                <FontAwesome
                                    name={item.icon}
                                    size={14}
                                    color={item.danger ? theme.error : theme.subtleText}
                                    style={styles.infoIcon}
                                />
                                <Text style={[styles.actionLabel, { color: item.danger ? theme.error : theme.text, flex: 1 }]}>
                                    {item.label}
                                </Text>
                                <FontAwesome name="chevron-right" size={11} color={theme.subtleText} />
                            </Pressable>
                        </View>
                    ))}
                </View>

                <Text style={[styles.version, { color: theme.subtleText }]}>Clarity v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: {
        paddingHorizontal: 22,
        paddingTop: Platform.OS === 'android' ? 16 : 8,
        paddingBottom: 80,
        gap: 20,
    },
    pageTitle: {
        fontSize: 22, fontFamily: F.bold, textAlign: 'center', marginBottom: 4,
    },
    // Avatar
    avatarSection: { alignItems: 'center', position: 'relative', marginBottom: 4 },
    avatarFrame: {
        width: 110, height: 110, borderRadius: 55, overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarBg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    avatarInitials: { fontSize: 36, fontFamily: F.bold },
    editBadge: {
        position: 'absolute', bottom: 2, right: '32%',
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    // Card
    card: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 17, fontFamily: F.bold },
    editBtn: { fontSize: 14, fontFamily: F.medium },
    // Info rows
    sep: { height: 1, marginVertical: 14 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 2 },
    infoIcon: { marginTop: 2, width: 16, textAlign: 'center' },
    infoLabel: { fontSize: 11, fontFamily: F.regular, textTransform: 'uppercase', letterSpacing: 0.3 },
    infoValue: { fontSize: 14, fontFamily: F.medium, marginTop: 2 },
    // Action rows
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
    actionLabel: { fontSize: 15, fontFamily: F.medium },
    version: { textAlign: 'center', fontSize: 12, fontFamily: F.regular },
});
