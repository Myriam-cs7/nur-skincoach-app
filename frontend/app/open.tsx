import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Feather from '@react-native-vector-icons/feather';

import { theme, makeStyles } from '../src/theme';
import { BrandHeader, SectionLabel } from '../src/ui';
import { API_BASE } from '../src/api';
import { useT } from '../src/i18n';

/**
 * Private access page — for the brand and the influencers only.
 * Never linked from the client app: it exists so anyone can open Nūr on a phone
 * with a plain web link, without Expo Go and without the camera.
 */
const APP_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

const PRETTY_URL = APP_URL.replace(/^https?:\/\//, '');
const QR_SRC = `${API_BASE}/qr?size=520&margin=2&data=${encodeURIComponent(APP_URL)}`;

export default function OpenOnPhone() {
  const router = useRouter();
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const copy = async () => {
    await Clipboard.setStringAsync(APP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    try {
      await Share.share({ message: `${t('open.share.msg')} ${APP_URL}` });
    } catch {}
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BrandHeader title={t('open.title')} onBack={goBack} />
          <Text style={styles.hidden} testID="open-title">{t('open.title')}</Text>
          <Text style={styles.lede}>{t('open.sub')}</Text>

          {/* The link, big enough to read and copy in one tap */}
          <Pressable style={styles.linkCard} onPress={copy} testID="open-copy-link">
            <Text style={styles.linkLabel}>{t('open.link')}</Text>
            <Text style={styles.linkUrl} numberOfLines={2} selectable>{PRETTY_URL}</Text>
            <View style={styles.copyRow}>
              <Feather name={copied ? 'check' : 'copy'} size={13} color={theme.color.brand} />
              <Text style={styles.copyTxt} testID="open-copy-state">
                {copied ? t('open.copied') : t('open.copy')}
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.shareBtn} onPress={share} testID="open-share">
            <Feather name="send" size={14} color={theme.color.onBrand} />
            <Text style={styles.shareTxt}>{t('open.share')}</Text>
          </Pressable>

          <SectionLabel label={t('open.qr.title')} />
          <View style={styles.qrCard}>
            <Image source={{ uri: QR_SRC }} style={styles.qr} resizeMode="contain" testID="open-qr" />
            <Text style={styles.qrHint}>{t('open.qr.hint')}</Text>
          </View>

          <SectionLabel label={t('open.steps.title')} />
          <View style={styles.steps}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.stepRow}>
                <Text style={styles.stepNum}>{String(n).padStart(2, '0')}</Text>
                <Text style={styles.stepTxt}>{t(`open.step.${n}`)}</Text>
              </View>
            ))}
          </View>

          <SectionLabel label={t('open.fix.title')} />
          <View style={styles.fixCard}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.fixRow}>
                <Feather name="alert-circle" size={13} color={theme.color.brand} />
                <Text style={styles.fixTxt}>{t(`open.fix.${n}`)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.private}>{t('open.private')}</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  hidden: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  lede: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  linkCard: {
    marginTop: theme.spacing.xl, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.borderGold,
    padding: theme.spacing.lg, gap: theme.spacing.sm,
  },
  linkLabel: { ...theme.type.cardLabel, color: theme.color.onSurfaceSecondary, textTransform: 'uppercase' },
  linkUrl: { fontFamily: theme.font.displayBold, fontSize: 19, lineHeight: 25, color: theme.color.onSurface },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyTxt: { ...theme.type.micro, color: theme.color.brand },
  shareBtn: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 16, ...theme.shadow.cta,
  },
  shareTxt: { ...theme.type.button, color: theme.color.onBrand },
  qrCard: {
    alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border, padding: theme.spacing.lg,
  },
  qr: { width: 190, height: 190, borderRadius: theme.radius.sm, backgroundColor: '#FFFFFF' },
  qrHint: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textAlign: 'center' },
  steps: { gap: theme.spacing.md },
  stepRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  stepNum: { ...theme.type.cardLabel, color: theme.color.brand, width: 22, paddingTop: 3 },
  stepTxt: { ...theme.type.body, color: theme.color.onSurfaceTertiary, flex: 1 },
  fixCard: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.borderGold, padding: theme.spacing.lg, gap: theme.spacing.md,
  },
  fixRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  fixTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceTertiary, flex: 1 },
  private: { ...theme.type.micro, color: theme.color.onSurfaceSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
}));
