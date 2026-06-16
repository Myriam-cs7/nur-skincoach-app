import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { theme } from '../src/theme';
import { Wordmark, GoldDivider } from '../src/ui';
import { api, getStoredUserId, setStoredUser } from '../src/api';
import { useT } from '../src/i18n';

const LOGO_URL =
  'https://customer-assets.emergentagent.com/job_nur-protocol-skin/artifacts/vlelvply_Nur%20Logo.png?v=2';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { t } = useT();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, true);
    (async () => {
      const uid = await getStoredUserId();
      if (uid) {
        try {
          const u = await api.getUser(uid);
          if (u?.diagnosis) router.replace('/(tabs)/home');
          else if (u?.intake) router.replace('/scan');
          else router.replace('/onboarding');
        } catch {}
      }
    })();
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.45,
  }));

  const onActivate = async () => {
    try {
      const r = await api.activate();
      await setStoredUser(r.user_id, r.activation_code);
      router.push('/onboarding');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0e0a04', '#06060A', '#04040A']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle gold vignette */}
      <View style={styles.vignette} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <Text style={styles.kicker} testID="welcome-kicker">{t('welcome.kicker')}</Text>
        </View>

        {/* LED color ring */}
        <View style={styles.ledRing}>
          {[theme.color.ledRed, theme.color.ledYellow, theme.color.ledGreen, theme.color.ledCyan, theme.color.ledBlue, theme.color.ledViolet].map((c, i) => (
            <Animated.View key={i} style={[styles.ledDot, { backgroundColor: c, shadowColor: c }, haloStyle]} />
          ))}
        </View>

        <View style={styles.centerBlock}>
          <Animated.View style={[styles.logoOuterGlow, haloStyle]} />
          <View style={styles.logoStage}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" transition={500} />
          </View>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title} testID="welcome-title">{t('welcome.title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            onPress={onActivate}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            testID="activate-button"
          >
            <Feather name="maximize" size={16} color={theme.color.onBrand} />
            <Text style={styles.ctaText}>{t('welcome.cta')}</Text>
          </Pressable>
          <Pressable onPress={onActivate} testID="manual-code-button">
            <Text style={styles.linkText}>{t('welcome.link')}</Text>
          </Pressable>
          <View style={styles.privacyRow}>
            <Feather name="lock" size={10} color={theme.color.brand} />
            <Text style={styles.privacyText}>{t('welcome.privacy')}</Text>
          </View>
          <Text style={styles.footnote}>{t('welcome.footnote')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const LOGO_SIZE = width * 0.55;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(201,169,97,0.04)' },
  safe: { flex: 1, paddingHorizontal: theme.spacing.xl },
  topRow: { alignItems: 'center', paddingTop: theme.spacing.sm },
  kicker: { color: theme.color.brand, letterSpacing: 4, fontSize: 10, fontWeight: '600', fontFamily: theme.font.sans },
  ledRing: { flexDirection: 'row', justifyContent: 'space-around', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.huge },
  ledDot: { width: 6, height: 6, borderRadius: 999, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoOuterGlow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    shadowColor: theme.color.brand,
    shadowOpacity: 0.55,
    shadowRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'transparent',
  },
  logoStage: {
    width: LOGO_SIZE + 40,
    height: LOGO_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  title: {
    color: theme.color.onSurface,
    fontFamily: theme.font.serif,
    fontSize: 38,
    marginTop: theme.spacing.lg,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  bottom: { gap: theme.spacing.md, alignItems: 'center', paddingBottom: theme.spacing.md },
  cta: {
    backgroundColor: theme.color.brand,
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minWidth: width * 0.78,
    justifyContent: 'center',
    shadowColor: theme.color.brand,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sans, letterSpacing: 1 },
  linkText: { color: theme.color.onSurfaceSecondary, fontSize: 12, textDecorationLine: 'underline', letterSpacing: 0.5 },
  privacyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  privacyText: { color: theme.color.onSurfaceSecondary, fontSize: 10, opacity: 0.7, flex: 1, textAlign: 'center', letterSpacing: 0.3 },
  footnote: { color: theme.color.brand, opacity: 0.5, fontSize: 9, letterSpacing: 2.5, textAlign: 'center', fontWeight: '600' },
});
