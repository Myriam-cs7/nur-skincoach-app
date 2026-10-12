import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { theme } from '../src/theme';
import { GoldDivider } from '../src/ui';
import { api, getStoredUserId } from '../src/api';
import { useT } from '../src/i18n';

const LOGO = require('../assets/images/nur-logo.png');


export default function Welcome() {
  const router = useRouter();
  const { t } = useT();
  const pulse = useSharedValue(0);
  const { width: winWidth } = useWindowDimensions();
  const stageWidth = Math.min(winWidth, 480) - theme.spacing.xl * 2;
  const logoW = stageWidth * 0.92;
  const logoH = logoW * (529 / 935);

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

  const onActivate = () => {
    router.push('/activate');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.gradient.page}
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
          {[theme.color.ledRed, theme.color.ledYellow, theme.color.ledGreen, theme.color.ledCyan, theme.color.ledBlue, theme.color.ledViolet, theme.color.ledWhite].map((c, i) => (
            <Animated.View key={i} style={[styles.ledDot, { backgroundColor: c, shadowColor: c }, haloStyle]} />
          ))}
        </View>

        <View style={styles.centerBlock}>
          <View style={{ width: logoW, height: logoH, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={LOGO} style={{ width: logoW, height: logoH }} contentFit="contain" transition={400} />
          </View>
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
          <Pressable onPress={() => router.push('/discover')} testID="discover-button" style={styles.secondaryCta}>
            <Feather name="zap" size={14} color={theme.color.brand} />
            <Text style={styles.secondaryCtaText}>{t('discover.cta_welcome')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/scan-qr')} testID="manual-code-button">
            <Text style={styles.linkText}>{t('gate.scan_card')}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(201,169,97,0.05)' },
  safe: { flex: 1, paddingHorizontal: theme.spacing.xl },
  topRow: { alignItems: 'center', paddingTop: theme.spacing.sm },
  kicker: { color: theme.color.brand, letterSpacing: 4, fontSize: 10, fontWeight: '600', fontFamily: theme.font.sans },
  ledRing: { flexDirection: 'row', justifyContent: 'space-around', marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.huge },
  ledDot: { width: 6, height: 6, borderRadius: 999, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: theme.color.onSurface,
    fontFamily: theme.font.serif,
    fontSize: 36,
    marginTop: theme.spacing.xl,
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
    alignSelf: 'stretch',
    justifyContent: 'center',
    ...theme.shadow.cta,
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sans, letterSpacing: 1 },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.color.borderGold,
    backgroundColor: theme.color.brandTint,
  },
  secondaryCtaText: { color: theme.color.brandDeep, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  linkText: { color: theme.color.onSurfaceSecondary, fontSize: 12, textDecorationLine: 'underline', letterSpacing: 0.5 },
  privacyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  privacyText: { color: theme.color.onSurfaceSecondary, fontSize: 10, opacity: 0.7, flex: 1, textAlign: 'center', letterSpacing: 0.3 },
  footnote: { color: theme.color.brand, opacity: 0.5, fontSize: 9, letterSpacing: 2.5, textAlign: 'center', fontWeight: '600' },
});
