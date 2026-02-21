
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SettingsScreen() {
    const theme = Colors[useColorScheme() ?? 'light'];
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={{ color: theme.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24 }}>Settings</Text>
            <Text style={{ color: theme.subtleText, marginTop: 8 }}>Coming Soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
