
import { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark']; // Force dark/wireframe
    const router = useRouter();
    const { logout, user } = useAuth();

    const displayName = useMemo(() => {
        if (user?.name) return user.name;
        if (user?.email) return user.email.split('@')[0];
        return 'USER_01';
    }, [user]);

    const initials = useMemo(() => {
        if (!displayName) return 'ID';
        const parts = displayName.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return displayName.slice(0, 2).toUpperCase();
    }, [displayName]);

    const handleLogout = async () => {
        Toast.show({ type: 'info', text1: 'SESSION TERMINATED', text2: 'Secure disconnect complete.' });
        await logout();
        router.replace('/login');
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={[styles.tag, { borderColor: theme.text }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>USER_CONFIG</Text>
                </View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>PROFILE_DATA</Text>
            </View>

            <View style={[styles.profileCard, { borderColor: theme.text, backgroundColor: theme.background }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.avatarContainer, { borderColor: theme.text }]}>
                        <Text style={[styles.avatarText, { color: theme.text }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: theme.text }]}>{displayName.toUpperCase()}</Text>
                        <Text style={[styles.userEmail, { color: theme.subtleText }]}>{user?.email?.toUpperCase()}</Text>
                        <Text style={[styles.idLabel, { color: theme.subtleText }]}>ID: {Math.random().toString(36).substr(2, 8).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Decorative Tech Lines */}
                <View style={[styles.techLine, { backgroundColor: theme.text }]} />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subtleText }]}>SYSTEM_PREFERENCES</Text>

                <View style={[styles.row, { borderBottomColor: theme.text }]}>
                    <View style={styles.rowIcon}>
                        <FontAwesome name="terminal" size={16} color={theme.text} />
                    </View>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>INTERFACE_MODE</Text>
                    <Text style={[styles.rowValue, { color: theme.text }]}>DARK_WIRE</Text>
                </View>

                <View style={[styles.row, { borderBottomColor: theme.text }]}>
                    <View style={styles.rowIcon}>
                        <FontAwesome name="bell-o" size={16} color={theme.text} />
                    </View>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>NOTIFICATIONS</Text>
                    <Text style={[styles.rowValue, { color: theme.text }]}>ACTIVE</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subtleText }]}>SESSION_CONTROL</Text>
                <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [
                        styles.menuItem,
                        { borderColor: theme.text, opacity: pressed ? 0.7 : 1 }
                    ]}
                >
                    <View style={[styles.iconContainer, { borderColor: theme.text }]}>
                        <FontAwesome name="power-off" size={16} color={theme.text} />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: theme.text }]}>TERMINATE_SESSION</Text>
                        <Text style={[styles.menuSubtitle, { color: theme.subtleText }]}>Disconnect from local node</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={theme.text} />
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.versionText, { color: theme.subtleText }]}>CLARITY_SYS v1.0.0 // STABLE</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    header: {
        paddingTop: 40,
        marginBottom: 32,
        gap: 8,
    },
    tag: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 1,
    },
    profileCard: {
        borderWidth: 1,
        padding: 20,
        marginBottom: 40,
        borderRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2, // Square-ish
    },
    avatarText: {
        fontSize: 20,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold', // Keep name readable
        letterSpacing: 0.5,
    },
    userEmail: {
        fontSize: 12,
        fontFamily: 'Courier',
        marginBottom: 4,
    },
    idLabel: {
        fontSize: 10,
        fontFamily: 'Courier',
        opacity: 0.7,
    },
    techLine: {
        height: 1,
        width: '100%',
        marginTop: 20,
        opacity: 0.5,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderRadius: 2,
        gap: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 2,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    menuSubtitle: {
        fontSize: 10,
        fontFamily: 'Courier',
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        paddingHorizontal: 4,
        gap: 12,
    },
    rowIcon: {
        width: 24,
        alignItems: 'center',
    },
    rowLabel: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    rowValue: {
        fontSize: 12,
        fontFamily: 'Courier',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 60,
    },
    versionText: {
        fontSize: 10,
        fontFamily: 'Courier',
        opacity: 0.5,
    },
});
