import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme, makeStyles } from '../src/theme';
import { BrandHeader } from '../src/ui';
import { useT } from '../src/i18n';
import { setPatchState } from '../src/patchTest';

export default function PatchTest() {
  const router = useRouter();
  const { t } = useT();
  const [saved, setSaved] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  const mark = async (status: 'done' | 'later') => {
    await setPatchState(status);
    if (status === 'later') { goBack(); return; }
    setSaved(true);
    setTimeout(goBack, 900);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BrandHeader title={t('patch.title')} onBack={goBack} />
          <Text style={styles.hidden} testID="patch-title">{t('patch.title')}</Text>
          <Text style={styles.lede}>{t('patch.sub')}</Text>

          <View style={styles.timerCard}>
            <Text style={styles.timerValue}>10</Text>
            <Text style={styles.timerUnit}>{t('common.minutes')}</Text>
          </View>

          <View style={styles.steps}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={styles.stepRow}>
                <Text style={styles.stepNum}>{String(n).padStart(2, '0')}</Text>
                <Text style={styles.stepTxt}>{t(`patch.${n}`)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.warnCard}>
            <Feather name="alert-circle" size={14} color={theme.color.brand} />
            <Text style={styles.warnTxt}>{t('patch.warn')}</Text>
          </View>

          {saved ? (
            <View style={styles.okRow} testID="patch-saved">
              <Feather name="check-circle" size={14} color={theme.color.success} />
              <Text style={styles.okTxt}>{t('patch.ok')}</Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.cta} onPress={() => mark('done')} testID="patch-done">
                <Text style={styles.ctaTxt}>{t('patch.done')}</Text>
              </Pressable>
              <Pressable onPress={() => mark('later')} style={styles.later} testID="patch-later">
                <Text style={styles.laterTxt}>{t('patch.later')}</Text>
              </Pressable>
            </>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  hidden: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  lede: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  timerCard: {
    marginVertical: theme.spacing.xl, alignItems: 'center', justifyContent: 'center',    paddingVertical: theme.spacing.xl, borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.borderGold,
  },
  timerValue: { fontFamily: theme.font.displayBold, fontSize: 56, lineHeight: 62, color: theme.color.onSurface, letterSpacing: -1 },
  timerUnit: { ...theme.type.label, color: theme.color.brand, textTransform: 'uppercase' },
  steps: { gap: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  stepRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  stepNum: { ...theme.type.cardLabel, color: theme.color.brand, width: 22, paddingTop: 3 },
  stepTxt: { ...theme.type.body, color: theme.color.onSurfaceTertiary, flex: 1 },
  warnCard: {
    flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start',
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.borderGold, padding: theme.spacing.lg,
  },
  warnTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceTertiary, flex: 1 },
  cta: {
    marginTop: theme.spacing.xl, alignItems: 'center', backgroundColor: theme.color.brand,
    borderRadius: theme.radius.pill, paddingVertical: 17, ...theme.shadow.cta,
  },
  ctaTxt: { ...theme.type.button, color: theme.color.onBrand },
  later: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  laterTxt: { ...theme.type.body, color: theme.color.onSurfaceSecondary, textDecorationLine: 'underline' },
  okRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xl },
  okTxt: { ...theme.type.body, color: theme.color.success },
}));
