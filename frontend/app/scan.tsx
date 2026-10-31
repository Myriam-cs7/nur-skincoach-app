import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, makeStyles } from '../src/theme';
import { useT } from '../src/i18n';
import PhotoConsentSheet from '../src/components/PhotoConsentSheet';

const { width } = Dimensions.get('window');

export default function Scan() {
  const router = useRouter();
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consent, setConsent] = useState(false);

  const goAnalyze = (b64?: string) => {
    if (b64) router.replace({ pathname: '/analyzing', params: { b64 } });
    else router.replace('/analyzing');
  };

  const askConsent = () => setConsentOpen(true);

  const onCapture = async (consented = false) => {
    if (!cameraRef.current || busy) return;
    if (!consent && !consented) return askConsent();
    setBusy(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7, skipProcessing: true });
      const manipulated = await ImageManipulator.manipulateAsync(
        pic.uri, [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      goAnalyze(manipulated.base64!);
    } catch (e) { console.warn(e); setBusy(false); }
  };

  const onSkip = () => goAnalyze();

  const acceptConsent = () => {
    setConsent(true);
    setConsentOpen(false);
    // consent state is not yet committed in this render — call with the guard bypassed
    setTimeout(() => void onCapture(true), 0);
  };

  const declineConsent = () => {
    setConsentOpen(false);
    goAnalyze();
  };

  // No-permission / not-granted state — show the choice clearly (not blocking)
  if (!permission || !permission.granted) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[theme.color.brandTint, theme.color.surface]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12} testID="scan-back">
              <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
            </Pressable>
            <Text style={styles.kicker}>{t('scan.kicker')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.permCenter}>
            <View style={styles.iconCircle}>
              <Feather name="camera" size={28} color={theme.color.brand} />
            </View>
            <Text style={styles.title}>{t('scan.perm.title')}</Text>
            <Text style={styles.subtitle}>{t('scan.perm.sub')}</Text>

            <View style={styles.privacyBox}>
              <Feather name="lock" size={12} color={theme.color.brand} />
              <Text style={styles.privacyText}>{t('welcome.privacy')}</Text>
            </View>
          </View>

          <View style={styles.bottomPanel}>
            <Pressable style={styles.cta} onPress={async () => { await requestPermission(); }} testID="grant-camera">
              <Feather name="camera" size={16} color={theme.color.onBrand} />
              <Text style={styles.ctaText}>{t('scan.perm.allow')}</Text>
            </Pressable>
            <Pressable onPress={onSkip} style={styles.skipBtn} testID="skip-button">
              <Text style={styles.skipText}>{t('scan.skip')}</Text>
              <Feather name="arrow-right" size={14} color={theme.color.brand} />
            </Pressable>
          </View>
        </SafeAreaView>
        <PhotoConsentSheet visible={consentOpen} onAccept={acceptConsent} onDecline={declineConsent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
      <LinearGradient
        colors={['rgba(6,6,10,0.95)', 'transparent', 'transparent', 'rgba(6,6,10,0.98)']}
        locations={[0, 0.22, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="scan-back">
            <Feather name="x" size={22} color={theme.color.onCamera} />
          </Pressable>
          <Text style={styles.kicker}>{t('scan.kicker')}</Text>
          <Pressable onPress={onSkip} hitSlop={12} testID="skip-top">
            <Text style={styles.skipTopText}>{t('common.skip')}</Text>
          </Pressable>
        </View>

        <View style={styles.guideContainer} pointerEvents="none">
          <View style={styles.faceGuide}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.tipRow}>
            <Feather name="sun" size={12} color={theme.color.brand} />
            <Text style={styles.tip}>{t('scan.tip1')}</Text>
          </View>
          <View style={styles.tipRow}>
            <Feather name="smile" size={12} color={theme.color.brand} />
            <Text style={styles.tip}>{t('scan.tip2')}</Text>
          </View>

          <Pressable onPress={() => onCapture()} disabled={busy} style={[styles.shutter, busy && { opacity: 0.5 }]} testID="capture-button">
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore}>
                {busy ? <ActivityIndicator color={theme.color.onBrand} /> : <Feather name="camera" size={22} color={theme.color.onBrand} />}
              </View>
            </View>
          </Pressable>

          <View style={styles.bottomActions}>
            <Pressable onPress={onSkip} disabled={busy} testID="skip-button">
              <Text style={styles.linkText}>{t('scan.skip')}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      <PhotoConsentSheet visible={consentOpen} onAccept={acceptConsent} onDecline={declineConsent} />
    </View>
  );
}

const GUIDE = width * 0.7;

const styles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: theme.color.surface },
  safe: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  kicker: { color: theme.color.brand, fontSize: 10, fontFamily: theme.font.sansMedium, letterSpacing: 3, fontWeight: '600' },
  skipTopText: { color: theme.color.brand, fontSize: 12, fontFamily: theme.font.sans, fontWeight: '500' },
  permCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md },
  iconCircle: {
    width: 80, height: 80, borderRadius: 999,
    backgroundColor: theme.color.brandTint,
    borderWidth: 1, borderColor: theme.color.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 30, marginTop: theme.spacing.lg, letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, textAlign: 'center', lineHeight: 20, paddingHorizontal: theme.spacing.sm },
  privacyBox: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg, paddingVertical: 12,
    borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold,
  },
  privacyText: { color: theme.color.onSurfaceTertiary, fontSize: 11, fontFamily: theme.font.sans, flex: 1, letterSpacing: 0.2 },
  guideContainer: { alignItems: 'center', justifyContent: 'center' },
  faceGuide: { width: GUIDE, height: GUIDE * 1.3, borderRadius: GUIDE },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: theme.color.brand },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
  bottomPanel: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center' },
  tipRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  tip: { color: theme.color.onCamera, fontSize: 12, fontFamily: theme.font.sans },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl,
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    minWidth: width * 0.78, justifyContent: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.4, shadowRadius: 22, shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, fontFamily: theme.font.sansMedium, letterSpacing: 1 },
  linkText: { color: theme.color.onCamera, fontSize: 13, fontFamily: theme.font.sans, textDecorationLine: 'underline' },
  sep: { color: theme.color.onCamera, fontSize: 13, fontFamily: theme.font.sans },
  bottomActions: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.md },
  shutter: { marginTop: theme.spacing.lg },
  shutterRing: { width: 76, height: 76, borderRadius: 999, borderWidth: 2, borderColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  shutterCore: { width: 60, height: 60, borderRadius: 999, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  skipText: { color: theme.color.brand, fontSize: 13, fontFamily: theme.font.sansMedium, fontWeight: '600' },
}));
