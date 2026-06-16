import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Wordmark, SectionLabel, GoldDivider } from '../../src/ui';
import { api, getStoredUserId, clearStoredUser } from '../../src/api';
import { useT, setLang, getLang, Lang } from '../../src/i18n';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

export default function Profile() {
  const router = useRouter();
  const { t } = useT();
  const [user, setUser] = useState<any>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const currentLang = getLang();

  useEffect(() => {
    (async () => {
      const uid = await getStoredUserId();
      if (!uid) return;
      try {
        const u = await api.getUser(uid);
        setUser(u);
      } catch {}
    })();
  }, []);

  const onReset = async () => {
    const uid = await getStoredUserId();
    if (uid) { try { await api.resetUser(uid); } catch {} }
    await clearStoredUser();
    router.replace('/');
  };
  const onRedoScan = () => router.push('/scan');

  if (!user) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  const intake = user.intake || {};

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Wordmark label="NŪR PROTOCOL" />
          <Text style={styles.title} testID="profile-title">{intake.name || t('profile.title')}</Text>
          <Text style={styles.code}>{t('profile.code')} · {user.activation_code}</Text>
          <GoldDivider marginV={theme.spacing.xl} />

          <SectionLabel label={t('profile.language')} />
          <View style={styles.langRow}>
            {LANGS.map((l) => {
              const active = currentLang === l.code;
              return (
                <Pressable key={l.code} onPress={() => setLang(l.code)} style={[styles.langChip, active && styles.langChipActive]} testID={`lang-${l.code}`}>
                  <Text style={[styles.langTxt, active && styles.langTxtActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel label={t('profile.profile')} />
          <Row label="Type" value={intake.skin_type} />
          <Row label="Age" value={intake.age_range} />
          <Row label="Climate" value={intake.climate} />
          <Row label="Lifestyle" value={intake.lifestyle} />
          <Row label="Sleep" value={intake.sleep_hours} />
          <Row label="Stress" value={intake.stress_level} />
          <Row label="Hydration" value={intake.water_intake} />

          <SectionLabel label={t('profile.actions')} />
          <Pressable style={styles.actionRow} onPress={onRedoScan} testID="redo-scan">
            <Feather name="camera" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.redo')}</Text>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => setShowPrivacy(!showPrivacy)} testID="privacy-toggle">
            <Feather name="lock" size={16} color={theme.color.brand} />
            <Text style={styles.actionTxt}>{t('profile.privacy')}</Text>
            <Feather name={showPrivacy ? 'chevron-up' : 'chevron-right'} size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>
          {showPrivacy && (
            <View style={styles.privacyBody}>
              <Text style={styles.privacyTxt}>{t('profile.privacy.body')}</Text>
            </View>
          )}
          <Pressable style={styles.actionRow} onPress={onReset} testID="reset-account">
            <Feather name="log-out" size={16} color={theme.color.error} />
            <Text style={[styles.actionTxt, { color: theme.color.error }]}>{t('profile.reset')}</Text>
            <Feather name="chevron-right" size={16} color={theme.color.onSurfaceSecondary} />
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 32, marginTop: theme.spacing.lg, letterSpacing: -0.5 },
  code: { color: theme.color.onSurfaceSecondary, fontSize: 11, marginTop: 4, letterSpacing: 2, fontFamily: theme.font.mono },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  langChip: { paddingHorizontal: theme.spacing.lg, paddingVertical: 10, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surfaceSecondary },
  langChipActive: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTint },
  langTxt: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  langTxtActive: { color: theme.color.brand, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  rowLabel: { color: theme.color.onSurfaceSecondary, fontSize: 12, letterSpacing: 0.3 },
  rowValue: { color: theme.color.onSurface, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.color.divider },
  actionTxt: { flex: 1, color: theme.color.onSurface, fontSize: 14 },
  privacyBody: { backgroundColor: theme.color.surfaceSecondary, padding: theme.spacing.lg, borderRadius: theme.radius.md, marginVertical: theme.spacing.md, borderWidth: 1, borderColor: theme.color.borderGold },
  privacyTxt: { color: theme.color.onSurfaceTertiary, fontSize: 12, lineHeight: 20 },
});
