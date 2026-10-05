import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { GoldDivider, Wordmark } from '../src/ui';
import { useT } from '../src/i18n';

const CODE_RE = /NUR-[A-Z0-9-]{3,}/i;

export default function ScanQR() {
  const router = useRouter();
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [err, setErr] = useState<string | null>(null);
  const handled = useRef(false);

  const onScanned = ({ data }: { data: string }) => {
    if (handled.current) return;
    const value = (data || '').trim();
    const isNurLink = /nurprotocol/i.test(value) || value.startsWith('nurprotocol://');
    const match = value.match(CODE_RE);
    if (!isNurLink && !match) { setErr(t('scanqr.invalid')); return; }
    handled.current = true;
    router.replace({
      pathname: '/activate',
      params: match ? { code: match[0].toUpperCase(), scanned: '1' } : { scanned: '1' },
    });
  };

  const blocked = permission && !permission.granted && !permission.canAskAgain;
  const unsupported = Platform.OS === 'web';

  if (!permission?.granted || unsupported) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0e0a04', '#06060A', '#04040A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.gate} edges={['top', 'bottom']}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backAbs} testID="scanqr-back">
            <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
          </Pressable>
          <View style={styles.iconCircle}>
            <Feather name="maximize" size={24} color={theme.color.brand} />
          </View>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title}>{t('scanqr.title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.sub}>{unsupported ? t('notif.web_unsupported') : t('scanqr.perm_sub')}</Text>

          {!unsupported ? (
            blocked ? (
              <Pressable style={styles.cta} onPress={() => Linking.openSettings()} testID="scanqr-settings">
                <Feather name="settings" size={14} color={theme.color.onBrand} />
                <Text style={styles.ctaTxt}>{t('scanqr.settings')}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.cta} onPress={() => requestPermission()} testID="scanqr-allow">
                <Feather name="camera" size={14} color={theme.color.onBrand} />
                <Text style={styles.ctaTxt}>{t('scanqr.perm')}</Text>
              </Pressable>
            )
          ) : null}

          <Pressable onPress={() => router.replace('/activate')} style={{ marginTop: theme.spacing.lg }} testID="scanqr-manual">
            <Text style={styles.link}>{t('scanqr.manual')}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <SafeAreaView style={styles.camUi} edges={['top', 'bottom']}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backCam} testID="scanqr-back-cam">
          <Feather name="chevron-left" size={24} color={theme.color.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.bottomCard}>
          <Text style={styles.camTitle}>{t('scanqr.title')}</Text>
          <Text style={styles.camSub}>{t('scanqr.sub')}</Text>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable onPress={() => router.replace('/activate')} testID="scanqr-manual-cam">
            <Text style={styles.link}>{t('scanqr.manual')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  gate: { flex: 1, padding: theme.spacing.xl, justifyContent: 'center' },
  backAbs: { position: 'absolute', top: theme.spacing.lg, left: theme.spacing.xl },
  iconCircle: {
    alignSelf: 'center', width: 66, height: 66, borderRadius: 999,
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg,
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 28, textAlign: 'center', marginTop: theme.spacing.md },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  cta: {
    backgroundColor: theme.color.brand, borderRadius: theme.radius.pill, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  ctaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  link: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', marginTop: theme.spacing.md },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,4,10,0.55)' },
  frame: {
    width: 240, height: 240, borderRadius: theme.radius.lg,
    borderWidth: 2, borderColor: theme.color.brand, backgroundColor: 'transparent',
    shadowColor: theme.color.brand, shadowOpacity: 0.8, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  camUi: { flex: 1, padding: theme.spacing.xl },
  backCam: { alignSelf: 'flex-start' },
  bottomCard: {
    backgroundColor: 'rgba(15,15,20,0.92)', borderRadius: theme.radius.lg, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.color.borderGold, gap: 6,
  },
  camTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 20, textAlign: 'center' },
  camSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  err: { color: theme.color.error, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
