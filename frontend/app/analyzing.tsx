import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { theme } from '../src/theme';
import { api, getStoredUserId } from '../src/api';

const STEPS = [
  'Lecture du grain de peau…',
  'Repérage des zones à sublimer…',
  'Évaluation de l\'éclat et du teint…',
  'Conception de votre rituel LED sur-mesure…',
];

const { width } = Dimensions.get('window');

export default function Analyzing() {
  const router = useRouter();
  const { b64 } = useLocalSearchParams<{ b64: string }>();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i)), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getStoredUserId();
        if (!uid || !b64) throw new Error('Missing data');
        await api.diagnose(uid, b64 as string);
        router.replace('/diagnosis');
      } catch (e: any) {
        setError(e?.message || 'Erreur inconnue');
      }
    })();
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a1407', '#09090C', '#0b0d1a']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Animated.View style={[styles.orbWrap, orbStyle]}>
            <View style={[styles.orb, { backgroundColor: theme.color.ledRed, top: 0, left: '40%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledYellow, top: '20%', right: 0 }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledGreen, bottom: '15%', right: '8%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledCyan, bottom: 0, left: '40%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledBlue, bottom: '15%', left: '8%' }]} />
            <View style={[styles.orb, { backgroundColor: theme.color.ledViolet, top: '20%', left: 0 }]} />
          </Animated.View>
          <View style={styles.centerInner}>
            <Text style={styles.kicker}>NŪR · IA BEAUTÉ</Text>
            <Text style={styles.title} testID="analyzing-title">Bilan en cours</Text>
          </View>
        </View>

        <View style={styles.steps}>
          {error ? (
            <Text style={styles.error} testID="analyzing-error">{error}</Text>
          ) : (
            STEPS.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepDot, i <= stepIdx && styles.stepDotActive]} />
                <Text style={[styles.stepTxt, i <= stepIdx && styles.stepTxtActive]}>{s}</Text>
              </View>
            ))
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const ORB = width * 0.75;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbWrap: { width: ORB, height: ORB, position: 'absolute' },
  orb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 999,
    opacity: 0.85,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: '#fff',
  },
  centerInner: { alignItems: 'center', gap: 8 },
  kicker: { color: theme.color.brand, letterSpacing: 3, fontSize: 11, fontWeight: '600' },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30 },
  steps: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stepDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: theme.color.border },
  stepDotActive: { backgroundColor: theme.color.brand },
  stepTxt: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  stepTxtActive: { color: theme.color.onSurface },
  error: { color: theme.color.error, textAlign: 'center' },
});
