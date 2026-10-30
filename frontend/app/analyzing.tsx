import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { theme, makeStyles } from '../src/theme';
import { api, getStoredUserId } from '../src/api';
import { useT, getLang } from '../src/i18n';
import { Wordmark } from '../src/ui';

const { width } = Dimensions.get('window');

export default function Analyzing() {
  const router = useRouter();
  const { t } = useT();
  const { b64 } = useLocalSearchParams<{ b64?: string }>();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const STEPS = [t('analyzing.s1'), t('analyzing.s2'), t('analyzing.s3'), t('analyzing.s4')];

  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1);
  }, []);

  useEffect(() => {
    const t2 = setInterval(() => setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i)), 3500);
    return () => clearInterval(t2);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getStoredUserId();
        if (!uid) throw new Error('Missing user');
        await api.diagnose(uid, (b64 as string) || undefined, 'image/jpeg', getLang());
        router.replace('/diagnosis');
      } catch (e: any) {
        setError(e?.message || t('common.error'));
      }
    })();
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={theme.gradient.page} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
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
            <Wordmark label={t('analyzing.kicker')} />
            <Text style={styles.title} testID="analyzing-title">{t('analyzing.title')}</Text>
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

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbWrap: { width: ORB, height: ORB, position: 'absolute' },
  orb: { position: 'absolute', width: 22, height: 22, borderRadius: 999, opacity: 0.85, shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, shadowColor: '#fff' },
  centerInner: { alignItems: 'center', gap: 12 },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 32, letterSpacing: -0.3 },
  steps: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stepDot: { width: 5, height: 5, borderRadius: 999, backgroundColor: theme.color.border },
  stepDotActive: { backgroundColor: theme.color.brand },
  stepTxt: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, letterSpacing: 0.2 },
  stepTxtActive: { color: theme.color.onSurface },
  error: { color: theme.color.error, textAlign: 'center' },
}));
