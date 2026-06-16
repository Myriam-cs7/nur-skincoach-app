import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { theme } from '../src/theme';
import { api, getStoredUserId, setStoredUser } from '../src/api';

const LOGO_URL =
  'https://customer-assets.emergentagent.com/job_nur-protocol-skin/artifacts/vlelvply_Nur%20Logo.png?v=2';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }), -1, true);
    // auto-route if user already exists
    (async () => {
      const uid = await getStoredUserId();
      if (uid) {
        try {
          const u = await api.getUser(uid);
          if (u?.diagnosis) router.replace('/(tabs)/home');
          else if (u?.intake) router.replace('/scan');
          else router.replace('/onboarding');
        } catch {
          // stay on welcome
        }
      }
    })();
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.55,
    transform: [{ scale: 0.9 + pulse.value * 0.15 }],
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
        colors={['#1a1407', '#09090C', '#0b0d1a']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* LED color ring */}
      <View style={styles.ledRing} pointerEvents="none">
        {[theme.color.ledRed, theme.color.ledYellow, theme.color.ledGreen, theme.color.ledCyan, theme.color.ledBlue, theme.color.ledViolet].map((c, i) => (
          <Animated.View key={i} style={[styles.ledDot, { backgroundColor: c, shadowColor: c }, haloStyle]} />
        ))}
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.kicker} testID="welcome-kicker">© NŪR PROTOCOL · AT-HOME CLINIC</Text>
        </View>

        <View style={styles.centerBlock}>
          <Animated.View style={[styles.logoHalo, haloStyle]} />
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            contentFit="contain"
            transition={400}
          />
          <View style={styles.wordmarkWrap}>
            <View style={styles.hairline} />
            <Text style={styles.wordmark}>NŪR PROTOCOL</Text>
            <View style={styles.hairline} />
          </View>
          <Text style={styles.title} testID="welcome-title">At-Home Clinic</Text>
          <Text style={styles.subtitle}>
            Votre espace beauté privatisé.{'\n'}Bilan IA et rituel LED sur-mesure.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            onPress={onActivate}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            testID="activate-button"
          >
            <Feather name="maximize" size={18} color={theme.color.onBrand} />
            <Text style={styles.ctaText}>Scanner mon QR code</Text>
          </Pressable>
          <Pressable onPress={onActivate} testID="manual-code-button">
            <Text style={styles.linkText}>Entrer un code d&apos;activation</Text>
          </Pressable>
          <Text style={styles.footnote}>RÉSERVÉ AUX DÉTENTEURS D&apos;UN APPAREIL NŪR</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1, paddingHorizontal: theme.spacing.xl },
  header: { paddingTop: theme.spacing.sm, alignItems: 'center' },
  kicker: {
    color: theme.color.brand,
    letterSpacing: 4,
    fontSize: 11,
    fontFamily: theme.font.sans,
    fontWeight: '600',
  },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoHalo: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width,
    backgroundColor: 'transparent',
    shadowColor: theme.color.brand,
    shadowOpacity: 0.55,
    shadowRadius: 90,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.08)',
  },
  logo: { width: width * 0.62, height: width * 0.62 },
  wordmarkWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  hairline: { width: 32, height: 1, backgroundColor: theme.color.brandSoft, opacity: 0.6 },
  wordmark: { color: theme.color.brand, letterSpacing: 6, fontSize: 12, fontWeight: '600', fontFamily: theme.font.sans },
  title: {
    color: theme.color.onSurface,
    fontFamily: theme.font.serif,
    fontSize: 34,
    marginTop: theme.spacing.lg,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.sans,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  bottom: { gap: theme.spacing.lg, alignItems: 'center', paddingBottom: theme.spacing.lg },
  cta: {
    backgroundColor: theme.color.brand,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: width * 0.75,
    justifyContent: 'center',
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 15, fontFamily: theme.font.sans, letterSpacing: 0.3 },
  linkText: { color: theme.color.onSurfaceSecondary, fontSize: 13, textDecorationLine: 'underline' },
  footnote: { color: theme.color.onSurfaceSecondary, opacity: 0.45, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
  ledRing: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.xxxl,
  },
  ledDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
