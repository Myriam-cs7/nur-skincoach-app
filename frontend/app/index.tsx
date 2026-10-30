import React, { useEffect } from 'react';
import { View, Pressable, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { theme, makeStyles, getScheme } from '../src/theme';
import { api, getStoredUserId } from '../src/api';
import { useT } from '../src/i18n';

const LOGO_DARK = require('../assets/images/nur-logo.png');
const LOGO_LIGHT = require('../assets/images/nur-logo-light.png');

export default function Welcome() {
  const router = useRouter();
  const { t } = useT();
  const pulse = useSharedValue(0);
  const { width: winWidth } = useWindowDimensions();
  const stageWidth = Math.min(winWidth, 480) - theme.spacing.xl * 2;
  const logoW = stageWidth * 0.86;
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

  return (
    <View style={styles.root}>
      <LinearGradient colors={theme.gradient.page} locations={[0, 0.55, 1]} style={styles.fill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Text style={styles.signature} numberOfLines={1} testID="welcome-kicker">
          {t('brand.signature')}
        </Text>

        {/* The only vivid colours in the app: the 7 LED lights */}
        <View style={styles.ledRing}>
          {[theme.color.ledRed, theme.color.ledYellow, theme.color.ledGreen, theme.color.ledCyan, theme.color.ledBlue, theme.color.ledViolet, theme.color.ledWhite].map((c, i) => (
            <Animated.View key={i} style={[styles.ledDot, { backgroundColor: c, shadowColor: c }, haloStyle]} />
          ))}
        </View>

        <View style={styles.centerBlock}>
          <Image source={getScheme() === 'light' ? LOGO_LIGHT : LOGO_DARK} style={{ width: logoW, height: logoH }} contentFit="contain" transition={400} />
          <Text style={styles.title} testID="welcome-title">{t('welcome.title')}</Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            onPress={() => router.push('/activate')}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            testID="activate-button"
          >
            <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {t('welcome.cta')}
            </Text>
          </Pressable>
          <View style={styles.privacyRow}>
            <Feather name="lock" size={10} color={theme.color.brand} />
            <Text style={styles.privacyText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t('welcome.privacy')}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  safe: { flex: 1, paddingHorizontal: theme.spacing.xl },
  signature: {
    ...theme.type.label,
    color: theme.color.brand,
    textAlign: 'center',
    paddingTop: theme.spacing.md,
  },
  ledRing: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xxl, paddingHorizontal: theme.spacing.xxl },
  ledDot: { width: 5, height: 5, borderRadius: 999, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, borderWidth: 1, borderColor: theme.color.border },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl },
  title: {
    ...theme.type.display,
    color: theme.color.onSurface,
    textAlign: 'center',
  },
  bottom: { gap: theme.spacing.lg, alignItems: 'center', paddingBottom: theme.spacing.xl },
  cta: {
    backgroundColor: theme.color.brand,
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    ...theme.shadow.cta,
  },
  ctaText: { ...theme.type.button, color: theme.color.onBrand },
  privacyRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  privacyText: { ...theme.type.micro, color: theme.color.onSurfaceSecondary },
}));
