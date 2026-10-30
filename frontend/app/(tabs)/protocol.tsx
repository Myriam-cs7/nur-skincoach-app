import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme, makeStyles } from '../../src/theme';
import { GoldDivider, BrandHeader } from '../../src/ui';
import { LED_META, ledText, LedId } from '../../src/led';
import { api, getStoredUserId, DiagnosisRecord } from '../../src/api';
import { useT, getLang } from '../../src/i18n';

const LOCALES: Record<string, string> = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT', de: 'de-DE', ru: 'ru-RU', ar: 'ar',
};

function dayName(day: number, lang: string) {
  // day 1 = Monday — 2024-01-01 was a Monday
  const d = new Date(Date.UTC(2024, 0, day));
  return d.toLocaleDateString(LOCALES[lang] || 'fr-FR', { weekday: 'long', timeZone: 'UTC' });
}

export default function Protocol() {
  const { t } = useT();
  const lang = getLang();
  const [diag, setDiag] = useState<DiagnosisRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getStoredUserId();
        if (!uid) return;
        const d = await api.getDiagnosis(uid);
        setDiag(d);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;
  }

  if (!diag) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={['top']}>
        <Text style={styles.subtle}>{t('proto.empty')}</Text>
      </SafeAreaView>
    );
  }

  const { protocol } = diag.data;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BrandHeader title={t('proto.title')} subtitle={t('proto.kicker')} />
          <Text style={styles.hiddenTitle} testID="protocol-title">{t('proto.title')}</Text>
          <GoldDivider marginV={theme.spacing.md} />
          <Text style={styles.subtle}>{t('proto.sub', { weeks: protocol.total_weeks })}</Text>
          {protocol.sensitive_care ? (
            <Text style={styles.caution} testID="proto-caution">{t('device.caution')}</Text>
          ) : null}

          <View style={styles.timeline}>
            {protocol.weekly_schedule.map((d, idx) => {
              const id = d.led_color_id as LedId | null;
              const hex = id ? LED_META[id]?.hex : null;
              const info = id ? ledText(id, lang) : null;
              const isLast = idx === protocol.weekly_schedule.length - 1;
              return (
                <View key={d.day} style={styles.row}>
                  <View style={styles.lineCol}>
                    <View style={[styles.dot, hex ? { backgroundColor: hex } : styles.dotRest]} />
                    {!isLast && <View style={styles.line} />}
                  </View>
                  <View style={styles.dayBlock}>
                    <Text style={styles.dayName}>{dayName(d.day, lang)}</Text>
                    {info && hex ? (
                      <>
                        <Text style={[styles.colorName, { color: hex }]}>{t('proto.light', { name: info.name })}</Text>
                        <Text style={styles.deviceTxt}>
                          {d.device_mode || '—'} · {t('device.level', { n: d.brightness ?? 1 })} · {d.session_minutes} {t('common.minutes')}
                        </Text>
                        <Text style={styles.metaTxt}>{d.notes}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.colorName, { color: theme.color.onSurfaceSecondary }]}>{t('proto.pause')}</Text>
                        <Text style={styles.metaTxt}>{t('proto.pause_sub')}</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.expectedCard}>
            <Feather name="target" size={16} color={theme.color.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.expectedTitle}>{t('proto.expected')}</Text>
              <Text style={styles.expectedTxt}>{protocol.expected_results}</Text>
              <Text style={styles.metaTxt}>{t('proto.weeks', { weeks: protocol.total_weeks })}</Text>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles(() => ({
  // kept for accessibility/tests, visually replaced by BrandHeader
  hiddenTitle: { height: 0, opacity: 0, fontSize: 1, fontFamily: theme.font.sans },
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.display, fontSize: 30, marginTop: theme.spacing.md },
  subtle: { color: theme.color.onSurfaceSecondary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20 },
  caution: { ...theme.type.micro, color: theme.color.brand, marginTop: theme.spacing.sm },
  timeline: { marginTop: theme.spacing.xl },
  row: { flexDirection: 'row', gap: theme.spacing.lg },
  lineCol: { width: 16, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 999 },
  dotRest: { backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.borderStrong },
  line: { width: 1, flex: 1, backgroundColor: theme.color.borderStrong, marginTop: 4 },
  dayBlock: { flex: 1, paddingBottom: theme.spacing.xl, gap: 2 },
  dayName: { color: theme.color.onSurface, fontSize: 15, fontFamily: theme.font.sansMedium, fontWeight: '600', textTransform: 'capitalize' },
  colorName: { fontFamily: theme.font.displayBold, fontSize: 18, marginTop: 2 },
  deviceTxt: { ...theme.type.bodySm, color: theme.color.onSurfaceTertiary, marginTop: 2 },
  metaTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, fontFamily: theme.font.sans, textTransform: 'capitalize' },
  expectedCard: {
    flexDirection: 'row', gap: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1,
    borderColor: theme.color.borderGold, ...theme.shadow.card,
  },
  expectedTitle: { color: theme.color.onSurface, fontSize: 14, fontFamily: theme.font.sansMedium, fontWeight: '600', marginBottom: 4 },
  expectedTxt: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontFamily: theme.font.sans, lineHeight: 20, marginBottom: 4 },
}));
