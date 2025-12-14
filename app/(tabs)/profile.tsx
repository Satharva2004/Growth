import { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';

const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 23) return "Good Evening";
    return "NightOwl";
};

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { logout, user } = useAuth();

    const displayName = useMemo(() => {
        if (user?.name) return user.name;
        if (user?.email) return user.email.split('@')[0];
        return 'Goal Setter';
    }, [user]);

    const initials = useMemo(() => {
        if (!displayName) return 'GS';
        const parts = displayName.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return displayName.slice(0, 2).toUpperCase();
    }, [displayName]);

    const handleLogout = async () => {
        Toast.show({ type: 'info', text1: 'See you soon 👋', text2: 'Your growth path awaits when you return.' });
        await logout();
        router.replace('/login');
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
            </View>

            <View style={styles.profileCard}>
                <View style={[styles.avatarContainer, { backgroundColor: theme.tint }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
                <Text style={[styles.userEmail, { color: theme.subtleText }]}>{user?.email}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subtleText }]}>Preferences</Text>
                {/* Placeholder for future preferences */}
                <View style={[styles.row, { borderBottomColor: theme.cardBorder }]}>
                    <View style={styles.rowIcon}>
                        <FontAwesome name="moon-o" size={20} color={theme.text} />
                    </View>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
                    <Text style={[styles.rowValue, { color: theme.subtleText }]}>System</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subtleText }]}>Account</Text>
                <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [
                        styles.menuItem,
                        { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }
                    ]}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                        <FontAwesome name="sign-out" size={20} color="#D32F2F" />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: '#D32F2F' }]}>Log Out</Text>
                        <Text style={[styles.menuSubtitle, { color: theme.subtleText }]}>Sign out of your account</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={theme.subtleText} />
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.versionText, { color: theme.subtleText }]}>Clarity v1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        paddingTop: 40,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
    },
    profileCard: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarText: {
        fontSize: 36,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
    },
    userName: {
        fontSize: 24,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
    },
    menuSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    rowIcon: {
        width: 40,
        alignItems: 'center',
    },
    rowLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
    },
    rowValue: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    versionText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
});
