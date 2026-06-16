import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { theme, LED_COLORS, LED_NAMES_BY_LANG } from '../../src/theme';
import { Wordmark, GoldDivider } from '../../src/ui';
import { api, getStoredUserId, DiagnosisRecord } from '../../src/api';
import { useT, getLang } from '../../src/i18n';

export default function Home() {
  const { t } = useT();
  const lang = getLang();
  const [user, setUser] = useState<any>(null);
  const [diag, setDiag] = useState<DiagnosisRecord | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersOn, setRemindersOn] = useState(false);

  const load = useCallback(async () => {
    try {
      const uid = await getStoredUserId();
      if (!uid) return;
      const [u, d, s] = await Promise.all([
        api.getUser(uid),
        api.getDiagnosis(uid).catch(() => null),
        api.listSessions(uid).catch(() => ({ sessions: [] })),
      ]);
      setUser(u);
      setDiag(d as DiagnosisRecord | null);
      setSessions(s?.sessions || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayIdx = new Date().getDay();
  const todayDay = todayIdx === 0 ? 7 : todayIdx;
  const todayPlan = diag?.data?.protocol?.weekly_schedule?.find((d) => d.day === todayDay);
  const todayColorId = todayPlan?.led_color_id || null;
  const todayLedName = todayColorId ? (LED_NAMES_BY_LANG[lang]?.[todayColorId] || LED_COLORS[todayColorId]?.name) : null;
  const todayHex = todayColorId ? LED_COLORS[todayColorId]?.hex : null;

  const completedToday = sessions.some((s) => new Date(s.date || s.created_at).toDateString() === new Date().toDateString());
  const streak = computeStreak(sessions);

  const onComplete = async () => {
    if (!todayPlan?.led_color_id) return;
    const uid = await getStoredUserId();
    if (!uid) return;
    await api.logSession(uid, { led_color_id: todayPlan.led_color_id, duration_minutes: todayPlan.session_minutes || 12 });
    await load();
  };

  const toggleReminders = async (v: boolean) => {
    setRemindersOn(v);
    if (v) {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) { setRemindersOn(false); return; }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Nūr Protocol', body: 'Votre séance LED quotidienne vous attend.' },
        trigger: Platform.OS === 'web' ? null : ({ hour: 20, minute: 0, repeats: true } as any),
      });
    } else { await Notifications.cancelAllScheduledNotificationsAsync(); }
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greet.morning');
    if (h < 18) return t('home.greet.afternoon');
    return t('home.greet.evening');
  })();
  const name = user?.intake?.name ? `, ${user.intake.name}` : '';

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={theme.color.brand} refreshing={false} onRefresh={load} />}>
          <Wordmark label={t('home.kicker')} />
          <Text style={styles.title} testID="home-greet">{greeting}{name}</Text>
          <Text style={styles.dateTxt}>{new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <GoldDivider marginV={theme.spacing.lg} />

          <View style={styles.heroWrap}>
            {todayColorId && todayHex ? (
              <>
                <LinearGradient colors={[`${todayHex}55`, 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={[styles.heroOrb, { backgroundColor: todayHex, shadowColor: todayHex }]} />
                <Text style={styles.heroKicker}>{t('home.today.kicker')}</Text>
                <Text style={styles.heroTitle}>{todayLedName}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroPill}>
                    <Feather name="clock" size={11} color={theme.color.brand} />
                    <Text style={styles.heroPillTxt}>{todayPlan?.session_minutes} {t('common.minutes')}</Text>
                  </View>
                  {todayPlan?.intensity ? (
                    <View style={styles.heroPill}>
                      <Feather name="activity" size={11} color={theme.color.brand} />
                      <Text style={styles.heroPillTxt}>{t('common.intensity')} {todayPlan.intensity}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroSub}>{todayPlan?.notes}</Text>
                {completedToday ? (
                  <View style={styles.doneRow}>
                    <Feather name="check-circle" size={14} color={theme.color.success} />
                    <Text style={styles.doneTxt}>{t('home.done')}</Text>
                  </View>
                ) : (
                  <Pressable style={styles.heroCta} onPress={onComplete} testID="complete-session">
                    <Feather name="play" size={12} color={theme.color.onBrand} />
                    <Text style={styles.heroCtaTxt}>{t('home.start')}</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Feather name="moon" size={28} color={theme.color.brand} />
                <Text style={styles.heroTitle}>{t('home.rest.title')}</Text>
                <Text style={styles.heroSub}>{t('home.rest.sub')}</Text>
              </>
            )}
          </View>

          <View style={styles.statsRow}>
            <Stat label={t('home.stat.streak')} value={`${streak}`} icon="trending-up" />
            <Stat label={t('home.stat.sessions')} value={`${sessions.length}`} icon="check" />
            <Stat label={t('home.stat.week')} value={`${weekCount(sessions)}/${weeklyTarget(diag)}`} icon="calendar" />
          </View>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('home.reminders.title')}</Text>
              <Text style={styles.cardSub}>{t('home.reminders.sub')}</Text>
            </View>
            <Switch value={remindersOn} onValueChange={toggleReminders}
              trackColor={{ true: theme.color.brand, false: theme.color.borderStrong }}
              thumbColor={theme.color.onBrand} testID="reminders-toggle" />
          </View>

          {diag?.data?.summary ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('home.profile.title')}</Text>
              <Text style={styles.cardSub}>{diag.data.summary}</Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={12} color={theme.color.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function computeStreak(sessions: any[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => new Date(s.date || s.created_at).toDateString()));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function weekCount(sessions: any[]): number {
  const start = new Date(); start.setDate(start.getDate() - 6);
  return sessions.filter((s) => new Date(s.date || s.created_at) >= start).length;
}
function weeklyTarget(diag: DiagnosisRecord | null): number {
  if (!diag) return 0;
  return diag.data.protocol.weekly_schedule.filter((d) => d.led_color_id).length;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 34, marginTop: theme.spacing.md, letterSpacing: -0.5 },
  dateTxt: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 4, textTransform: 'capitalize', letterSpacing: 0.3 },
  heroWrap: {
    padding: theme.spacing.xl, borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.borderGold,
    overflow: 'hidden', gap: theme.spacing.sm, minHeight: 210, justifyContent: 'center',
  },
  heroOrb: { position: 'absolute', width: 160, height: 160, borderRadius: 999, right: -50, top: -40, opacity: 0.55, shadowOpacity: 0.9, shadowRadius: 70, shadowOffset: { width: 0, height: 0 } },
  heroKicker: { color: theme.color.brand, letterSpacing: 2.5, fontSize: 10, fontWeight: '700' },
  heroTitle: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 30, letterSpacing: -0.3 },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
  heroMetaRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, backgroundColor: theme.color.brandTint, borderWidth: 1, borderColor: theme.color.brand },
  heroPillTxt: { color: theme.color.brand, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  heroCta: {
    marginTop: theme.spacing.md, flexDirection: 'row', alignSelf: 'flex-start',
    backgroundColor: theme.color.brand, paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    borderRadius: theme.radius.pill, gap: 8, alignItems: 'center',
    shadowColor: theme.color.brand, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  heroCtaTxt: { color: theme.color.onBrand, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  doneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: theme.spacing.md },
  doneTxt: { color: theme.color.success, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  stat: { flex: 1, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.borderGold, gap: 6 },
  statValue: { color: theme.color.onSurface, fontFamily: theme.font.serif, fontSize: 26 },
  statLabel: { color: theme.color.onSurfaceSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.lg,
    backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.borderGold,
    gap: theme.spacing.md,
  },
  cardTitle: { color: theme.color.onSurface, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  cardSub: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
