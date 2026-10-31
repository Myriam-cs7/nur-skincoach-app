import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme, makeStyles, DEVICE_MODES } from '../src/theme';
import { BrandHeader, SectionLabel } from '../src/ui';
import { useT } from '../src/i18n';

function Steps({ items }: { items: string[] }) {
  return (
    <View style={styles.steps}>
      {items.map((txt, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={styles.stepTxt}>{txt}</Text>
        </View>
      ))}
    </View>
  );
}

function ButtonRow({ icon, name, sub }: { icon: any; name: string; sub: string }) {
  return (
    <View style={styles.btnRow}>
      <View style={styles.btnIcon}>
        <Feather name={icon} size={14} color={theme.color.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.btnName}>{name}</Text>
        <Text style={styles.btnSub}>{sub}</Text>
      </View>
    </View>
  );
}

export default function MaskManual() {
  const router = useRouter();
  const { t } = useT();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BrandHeader title={t('mask.title')} onBack={goBack} />
          <Text style={styles.hidden} testID="mask-title">{t('mask.title')}</Text>
          <Text style={styles.lede}>{t('mask.sub')}</Text>

          <SectionLabel label={t('mask.plug.title')} />
          <Steps items={[t('mask.plug.1'), t('mask.plug.2')]} />

          <SectionLabel label={t('mask.session.title')} />
          <Steps
            items={[
              t('mask.session.1'), t('mask.session.2'), t('mask.session.3'),
              t('mask.session.4'), t('mask.session.5'), t('mask.session.6'),
            ]}
          />

          <SectionLabel label={t('mask.buttons.title')} />
          <View style={styles.card}>
            <ButtonRow icon="power" name={t('mask.buttons.power')} sub={t('mask.buttons.power.sub')} />
            <ButtonRow icon="repeat" name={t('mask.buttons.mode')} sub={t('mask.buttons.mode.sub')} />
            <ButtonRow icon="sun" name={t('mask.buttons.bright')} sub={t('mask.buttons.bright.sub')} />
            <ButtonRow icon="clock" name={t('mask.buttons.timer')} sub={t('mask.buttons.timer.sub')} />
          </View>
          <View style={styles.modeList}>
            {DEVICE_MODES.map((m) => (
              <View key={m} style={styles.modeChip}>
                <Text style={styles.modeTxt}>{m}</Text>
              </View>
            ))}
          </View>

          <SectionLabel label={t('mask.rhythm.title')} />
          <Text style={styles.body}>{t('mask.rhythm.body')}</Text>

          <SectionLabel label={t('mask.care.title')} />
          <Steps items={[t('mask.care.1'), t('mask.care.2'), t('mask.care.3'), t('mask.care.4')]} />

          <SectionLabel label={t('mask.care.warn.title')} />
          <View style={styles.warnCard}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={styles.warnRow}>
                <Feather name="alert-circle" size={13} color={theme.color.brand} />
                <Text style={styles.warnTxt}>{t(`mask.care.warn.${n}`)}</Text>
              </View>
            ))}
            <Text style={styles.warnFoot}>{t('mask.care.warn.foot')}</Text>
          </View>

          <Pressable style={styles.patchCta} onPress={() => router.push('/patch-test')} testID="mask-patch-test">
            <Feather name="check-circle" size={14} color={theme.color.onBrand} />
            <Text style={styles.patchCtaTxt}>{t('patch.title')}</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  hidden: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  steps: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  stepRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  stepNum: { ...theme.type.cardLabel, color: theme.color.brand, width: 22, paddingTop: 3 },
  stepTxt: { ...theme.type.body, color: theme.color.onSurfaceTertiary, flex: 1 },
  card: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.border, padding: theme.spacing.lg,
    gap: theme.spacing.lg, marginBottom: theme.spacing.md,
  },
  btnRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  btnIcon: {
    width: 30, height: 30, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.borderGold,
  },
  btnName: { ...theme.type.h2, color: theme.color.onSurface },
  btnSub: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  modeList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  modeChip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: 7, borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.color.borderGold, backgroundColor: theme.color.brandTint,
  },
  modeTxt: { ...theme.type.cardLabel, color: theme.color.brand },
  body: { ...theme.type.body, color: theme.color.onSurfaceTertiary, marginBottom: theme.spacing.lg },
  lede: { ...theme.type.bodySm, color: theme.color.onSurfaceSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  warnCard: {
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.borderGold, padding: theme.spacing.lg, gap: theme.spacing.md,
  },
  warnRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  warnTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceTertiary, flex: 1 },
  warnFoot: { ...theme.type.micro, color: theme.color.onSurfaceSecondary, marginTop: theme.spacing.xs },
  patchCta: {
    marginTop: theme.spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, backgroundColor: theme.color.brand, borderRadius: theme.radius.pill,
    paddingVertical: 16, ...theme.shadow.cta,
  },
  patchCtaTxt: { ...theme.type.button, color: theme.color.onBrand },
}));
