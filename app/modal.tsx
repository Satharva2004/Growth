
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark']; // Force wireframe

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { borderColor: theme.text }]}>
        <Text style={[styles.title, { color: theme.text }]}>SYSTEM_INFO</Text>
        <View style={[styles.separator, { backgroundColor: theme.text }]} />

        <Text style={[styles.infoText, { color: theme.text }]}>
          CLARITY_V1.0
        </Text>
        <Text style={[styles.infoSubtext, { color: theme.subtleText }]}>
          SECURE_CONNECTION_ESTABLISHED
        </Text>
        <Text style={[styles.infoSubtext, { color: theme.subtleText }]}>
          ALL_SYSTEMS_NOMINAL
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
  },
  card: {
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2,
  },
  separator: {
    height: 1,
    width: '100%',
    opacity: 0.5,
  },
  infoText: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSubtext: {
    fontFamily: 'Courier',
    fontSize: 10,
  }
});
