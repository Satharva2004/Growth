
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
        <Text style={[styles.title, { color: theme.text }]}>Clarity</Text>
        <View style={[styles.separator, { backgroundColor: theme.divider }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.subtleText }]}>Version</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0 (Beta)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.subtleText }]}>Status</Text>
          <Text style={[styles.infoValue, { color: theme.success }]}>Online</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.subtleText }]}>Session</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>Secure</Text>
        </View>

        <Text style={[styles.footer, { color: theme.subtleText }]}>
          Tracking your financial freedom.
        </Text>
      </View>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  infoValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  footer: {
    marginTop: 20,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    textAlign: 'center',
  }
});
