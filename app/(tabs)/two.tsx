import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const hasCameraPermission = permission?.granted;

  useEffect(() => {
    if (!isFocused) {
      setIsPreviewReady(false);
    }
  }, [isFocused]);

  const handlePermissionRequest = useCallback(() => {
    requestPermission();
  }, [requestPermission]);

  const metrics = useMemo(
    () => [
      { label: 'Focus level', value: 'Steady', emoji: '🎯' },
      { label: 'Mood today', value: 'Upbeat', emoji: '😊' },
      { label: 'Energy pulse', value: 'Balanced', emoji: '🔋' },
    ],
    []
  );

  const reflectionPrompts = useMemo(
    () => [
      'What micro-win will move me 1% closer today?',
      'Which habit deserves a mindful upgrade tonight?',
      'How will I celebrate progress, not perfection?',
    ],
    []
  );

  const microActions = useMemo(
    () => [
      '📓 Log a single meaningful win',
      '🧘‍♂️ Take a 3-minute breathing break',
      '📝 Revisit weekly goals and adjust',
      '🤝 Share gratitude with an accountability buddy',
    ],
    []
  );

  return (
    <View style={[styles.background, { backgroundColor: theme.background }]}> 
      <SafeAreaView style={styles.safeArea}> 
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.cameraSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow }]}> 
            {!permission ? (
              <View style={styles.loadingCard}> 
                <ActivityIndicator color={theme.tint} size="large" />
              </View>
            ) : !hasCameraPermission ? (
              <View style={[styles.permissionCard, { borderColor: theme.cardBorder, backgroundColor: theme.secondarySurface }]}> 
                <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera access needed</Text>
                <Text style={[styles.permissionSubtitle, { color: theme.subtleText }]}>Glance at your reflection and remind yourself why your goals matter.</Text>
                <Pressable
                  style={[styles.permissionButton, { backgroundColor: theme.primary }]}
                  onPress={handlePermissionRequest}
                >
                  <Text style={[styles.permissionButtonText, { color: theme.primaryText }]}>Enable camera</Text>
                </Pressable>
              </View>
            ) : isFocused ? (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  facing="front"
                  active={isFocused}
                  onCameraReady={() => setIsPreviewReady(true)}
                />
                {!isPreviewReady && (
                  <View style={styles.cameraLoader}>
                    <ActivityIndicator color="#ffffff" size="large" />
                    <Text style={styles.cameraLoaderText}>Warming up your camera…</Text>
                  </View>
                )}
                <View style={styles.overlayMessage}>
                  <Text style={styles.overlayTitle}>See yourself. Why isn’t that goal done yet?</Text>
                  <Text style={styles.overlaySubtitle}>Refocus, recommit, and show up for future you.</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.permissionCard, { borderColor: theme.cardBorder, backgroundColor: theme.secondarySurface }]}> 
                <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera paused</Text>
                <Text style={[styles.permissionSubtitle, { color: theme.subtleText }]}>Return to this tab to see your reflection and recommit to your goals.</Text>
              </View>
            )}
          </View>

          <View
            style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow }]}
          >
            <Text style={[styles.heroBadge, { color: theme.badgeText, backgroundColor: theme.badgeBackground }]}>Daily reset 🌅</Text>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Check in with your future self</Text>
            <Text style={[styles.heroSubtitle, { color: theme.subtleText }]}>Align today’s intentions, track energy, and commit to mindful progress.</Text>
            <Pressable
              style={[styles.heroButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/goals/create')}
            >
              <Text style={[styles.heroButtonText, { color: theme.primaryText }]}>Design a new goal ✨</Text>
            </Pressable>
          </View>

          <View style={styles.section}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Vitals glance 💡</Text>
            <View style={styles.metricsRow}>
              {metrics.map((metric) => (
                <View
                  key={metric.label}
                  style={[styles.metricCard, { backgroundColor: theme.secondarySurface }]}
                >
                  <Text style={[styles.metricEmoji, { color: theme.text }]}>{metric.emoji}</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, { color: theme.subtleText }]}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Reflection prompts 🧘‍♀️</Text>
            <View style={styles.promptList}>
              {reflectionPrompts.map((prompt) => (
                <View
                  key={prompt}
                  style={[styles.promptCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <Text style={[styles.promptText, { color: theme.text }]}>{prompt}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Micro-actions for today ✅</Text>
            <View style={styles.actionList}>
              {microActions.map((action) => (
                <Pressable
                  key={action}
                  style={[styles.actionPill, { borderColor: theme.cardBorder, backgroundColor: theme.surface }]}
                  onPress={() => router.push('/(tabs)')}
                >
                  <Text style={[styles.actionText, { color: theme.text }]}>{action}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.tipCard, { backgroundColor: theme.secondarySurface, borderColor: theme.cardBorder }]}> 
            <Text style={[styles.tipTitle, { color: theme.text }]}>Mindful reminder 💛</Text>
            <Text style={[styles.tipBody, { color: theme.subtleText }]}>Small, consistent upgrades compound. Celebrate a 1% win before you log off.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 28,
  },
  cameraSection: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 8,
  },
  cameraWrapper: {
    position: 'relative',
    borderRadius: 22,
    overflow: 'hidden',
    height: 280,
    width: '100%',
    backgroundColor: '#000',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cameraLoaderText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  overlayMessage: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    transform: [{ rotate: '-2deg' }],
    gap: 6,
    pointerEvents: 'none',
  },
  overlayTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    lineHeight: 22,
  },
  overlaySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#f1f1f1',
  },
  permissionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  permissionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  permissionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 18,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Poppins_500Medium',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  heroButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  heroButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.1,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 110,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 8,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  metricEmoji: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.2,
  },
  promptList: {
    gap: 12,
  },
  promptCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Poppins_500Medium',
  },
  actionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionPill: {
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  tipTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  tipBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
  },
});
